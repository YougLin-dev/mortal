import { AppProtocol } from '@/main/core/protocols/app-protocol';
import { TITLE_BAR_OVERLAY, WIN } from '@/shared/consts/ui';
import { Handler, Service } from '@/shared/decorators';
import { getLoggerBy } from '@/shared/logging/helpers';
import { getContentViews, getTitlebarView, getWindowByWebContents, tagView, type TaggedWebContentsView } from '@/shared/types/view';
import { getAllShellWindows, isGhostWindow, tagBaseWindow, type Tab, type WindowState } from '@/shared/types/window';
import { toArgument } from '@/shared/utils/preload-utils';
import { isDev } from '@/main/utils/dev';
import { isMac } from '@/main/utils/platform';
import { BaseWindow, Menu, nativeTheme, WebContentsView, type IpcMainInvokeEvent, type WebContents } from 'electron';
import * as path from 'node:path';
import { WindowStateManager } from './window-state-manager';
import { storage } from '@/main/core/storage/config';
import { STORAGES } from '@/shared/types/storage-key';
import { eventEmitterService } from '../events/broadcaster';
import { GLOBAL_EVENTS } from '@/shared/types/event';

const logger = getLoggerBy('service', 'window', 'lifecycle');

const INDEX = {
  TITLEBAR: 'titlebar.html',
  CONTENT: 'content.html',
  LOADING: 'loading.html'
};

const topViewHeight = TITLE_BAR_OVERLAY.DARK.height;

const titlebarProtocol = new AppProtocol(
  'titlebar',
  'localhost',
  import.meta.dirname,
  path.join(import.meta.dirname, `./renderer/${MAIN_WINDOW_VITE_NAME}`),
  INDEX.TITLEBAR
);
const contentProtocol = new AppProtocol(
  'content',
  'localhost',
  import.meta.dirname,
  path.join(import.meta.dirname, `./renderer/${MAIN_WINDOW_VITE_NAME}`),
  INDEX.CONTENT
);
const loadingProtocol = new AppProtocol(
  'loading',
  'localhost',
  import.meta.dirname,
  path.join(import.meta.dirname, `./renderer/${MAIN_WINDOW_VITE_NAME}`),
  INDEX.LOADING
);

export function setupProtocolHandlers() {
  titlebarProtocol.setupHandler();
  loadingProtocol.setupHandler();
  contentProtocol.setupHandler();
}

@Service
export class ShellWindowService {
  private windows: Map<BaseWindow, { windowId: string }> = new Map();

  @Handler
  setAlwaysOnTop(_event: IpcMainInvokeEvent, alwaysOnTop: boolean): void {
    const window = BaseWindow.getFocusedWindow();
    if (window) {
      window.setAlwaysOnTop(alwaysOnTop);
    }
  }

  @Handler
  showTabContextMenu(event: IpcMainInvokeEvent, { tabId, template }: { tabId: string; template: { action: string; label: string }[] }): void {
    const webContentsId = event.sender.id;

    const menu = Menu.buildFromTemplate(
      template.map((item) => ({
        ...item,
        click: () => {
          eventEmitterService.emitTo(webContentsId, GLOBAL_EVENTS.TAB_CONTEXT_MENU_ACTION, {
            action: item.action,
            tabId
          });
        }
      }))
    );

    const window = getWindowByWebContents(event.sender);
    menu.popup({ window: window });
  }

  public createWindow(windowState: WindowState, opts?: { skipActiveTabContent?: boolean }): BaseWindow {
    const windowStateManager = new WindowStateManager({
      windowId: windowState.windowId,
      restoreFullScreen: false,
      restoreMaximized: true,
      defaultState: windowState
    });

    const newWindow = this.#buildWindowByWindowState(windowStateManager, opts);
    windowStateManager.manage(newWindow);
    this.#attachFirstShowGuards(newWindow);
    this.#loadWindow(newWindow, windowStateManager.windowState.tabs);

    return newWindow;
  }

  public createContentView(tabId: string, window: BaseWindow): TaggedWebContentsView | null {
    const windowId = this.windows.get(window)?.windowId;
    if (!windowId) {
      logger.error(`Error create webContentView, windowId = ${windowId}`);
      return null;
    }

    const windowState = storage.getSync(STORAGES.APP_WINDOWS(windowId));
    const [width, height] = window.getSize();
    const bottomWidth = width;
    const bottomHeight = height - topViewHeight;

    const view = tagView(
      new WebContentsView({
        webPreferences: {
          preload: contentProtocol.getPreloadFile(),
          nodeIntegration: false,
          contextIsolation: true,
          allowRunningInsecureContent: false,
          experimentalFeatures: false,
          devTools: isDev,
          additionalArguments: [toArgument('windowState', windowState), toArgument('locale', storage.getSync(STORAGES.APP_I18N_LOCALE))],
          transparent: true
        }
      }),
      'content',
      tabId
    );

    view.setBounds({ x: 0, y: topViewHeight, width: bottomWidth, height: bottomHeight });

    return view;
  }

  public async loadContentView(view: TaggedWebContentsView, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('View load timeout'));
      }, 10000);

      view.webContents.once('did-finish-load', () => {
        clearTimeout(timeout);
        logger.debug('View finished loading for tab {tabId}', { tabId: view.__tabId });
        resolve();
      });

      view.webContents.once('did-fail-load', (_event, _errorCode, errorDescription) => {
        clearTimeout(timeout);
        logger.error('View failed to load: {error}', { error: errorDescription, tabId: view.__tabId });
        resolve();
      });

      if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        view.webContents.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/${INDEX.CONTENT}#${url}`);

        view.webContents.once('did-frame-finish-load', () => {
          if (!view.webContents.isDestroyed() && !view.webContents.isDevToolsOpened()) {
            view.webContents.openDevTools({ mode: 'detach' });
          }
        });
      } else {
        const tabUrl = url.startsWith('/') ? url : `/${url}`;
        view.webContents.loadURL(`${contentProtocol.getLoadUrl()}#${tabUrl}`);
      }
    });
  }

  public bringViewToFront(window: BaseWindow, view: TaggedWebContentsView): void {
    window.contentView.addChildView(view);
    logger.debug('Brought view to front for tab {tabId}', { tabId: view.__tabId });
  }

  public destroyContentView(window: BaseWindow, view: TaggedWebContentsView): void {
    try {
      window.contentView.removeChildView(view);

      // Close DevTools if open (dev mode)
      if (isDev && !view.webContents.isDestroyed() && view.webContents.isDevToolsOpened()) {
        view.webContents.closeDevTools();
        logger.debug('Closed DevTools for tab {tabId}', { tabId: view.__tabId });
      }

      // Close webContents
      if (!view.webContents.isDestroyed()) {
        view.webContents.close();
      }

      logger.debug('Destroyed content view for tab {tabId}', { tabId: view.__tabId });
    } catch (error) {
      logger.error('Failed to destroy content view: {error}', { error, tabId: view.__tabId });
    }
  }

  public getWindowId(window: BaseWindow): string | undefined {
    return this.windows.get(window)?.windowId;
  }

  public getWindowById(windowId: string): BaseWindow | undefined {
    for (const [win, data] of this.windows.entries()) {
      if (data.windowId === windowId) {
        return win;
      }
    }
    return undefined;
  }

  public findWindowAtPoint(screenX: number, screenY: number): { win: BaseWindow; windowId: string } | null {
    const allWindows = getAllShellWindows();

    // Heuristic: prefer the currently focused window if it contains the point.
    // This avoids choosing an overlapped background window when dragging from the top window.
    const focused = BaseWindow.getFocusedWindow();
    if (focused && !focused.isDestroyed()) {
      const fb = focused.getBounds();
      const withinFocused = screenX >= fb.x && screenX <= fb.x + fb.width && screenY >= fb.y && screenY <= fb.y + fb.height;
      const focusedId = this.getWindowId(focused);
      if (withinFocused && focusedId) {
        return { win: focused, windowId: focusedId };
      }
    }

    // Fall back: scan all shell windows and pick the first that contains the point.
    // Note: BaseWindow.getAllWindows() ordering is not guaranteed; this is a best-effort fallback.
    for (const win of allWindows) {
      if (win.isDestroyed()) continue;
      const bounds = win.getBounds();
      const within = screenX >= bounds.x && screenX <= bounds.x + bounds.width && screenY >= bounds.y && screenY <= bounds.y + bounds.height;
      if (!within) continue;
      const windowId = this.getWindowId(win);
      if (windowId) return { win, windowId };
    }
    return null;
  }

  public isPointInTitlebar(win: BaseWindow, x: number, y: number): boolean {
    const bounds = win.getBounds();
    const relativeX = x - bounds.x;
    const relativeY = y - bounds.y;

    return relativeX >= 0 && relativeX <= bounds.width && relativeY >= 0 && relativeY <= topViewHeight;
  }

  /// private
  #buildWindowByWindowState(windowStateManager: WindowStateManager, opts?: { skipActiveTabContent?: boolean }) {
    const { shouldUseDarkColors } = nativeTheme;
    const newWindow = tagBaseWindow(
      new BaseWindow({
        show: false,
        x: windowStateManager.x,
        y: windowStateManager.y,
        width: windowStateManager.width,
        height: windowStateManager.height,
        minWidth: WIN.MIN_WIDTH,
        minHeight: WIN.MIN_HEIGHT,
        fullscreen: windowStateManager.isFullScreen,
        alwaysOnTop: windowStateManager.isAlwaysOnTop,
        backgroundColor: isMac ? undefined : shouldUseDarkColors ? WIN.BACKGROUND_CORLOR.DARK : WIN.BACKGROUND_CORLOR.LIGHT,
        autoHideMenuBar: true,
        titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
        titleBarOverlay: !isMac ? (shouldUseDarkColors ? TITLE_BAR_OVERLAY.DARK : TITLE_BAR_OVERLAY.LIGHT) : undefined,
        darkTheme: shouldUseDarkColors,
        frame: false,
        transparent: false,
        icon: path.join(import.meta.dirname, './resources/images/icon.png')
      }),
      'shell'
    );

    this.windows.set(newWindow, { windowId: windowStateManager.windowState.windowId });

    const bottomViewWidth = windowStateManager.width;
    const bottomViewHeight = windowStateManager.height - topViewHeight;

    const argumenst = [toArgument('windowState', windowStateManager.windowState), toArgument('locale', storage.getSync(STORAGES.APP_I18N_LOCALE))];

    // titlebar
    const topView = tagView(
      new WebContentsView({
        webPreferences: {
          preload: titlebarProtocol.getPreloadFile(),
          nodeIntegration: false,
          contextIsolation: true,
          allowRunningInsecureContent: false,
          experimentalFeatures: false,
          devTools: isDev,
          additionalArguments: argumenst,
          transparent: true
        }
      }),
      'titlebar'
    );

    topView.setBounds({ x: 0, y: 0, width: windowStateManager.width, height: topViewHeight });

    // loading
    const loadingView = tagView(
      new WebContentsView({
        webPreferences: {
          preload: loadingProtocol.getPreloadFile(),
          nodeIntegration: false,
          contextIsolation: true,
          allowRunningInsecureContent: false,
          experimentalFeatures: false,
          devTools: isDev,
          additionalArguments: argumenst,
          transparent: true
        }
      }),
      'content',
      '__loading__'
    );
    loadingView.setBounds({ x: 0, y: topViewHeight, width: bottomViewWidth, height: bottomViewHeight });

    // content views (only active tab)
    const activeTab = windowStateManager.windowState.tabs.find((tab) => tab.isActive);
    let activeTabContentView: null | TaggedWebContentsView = null;

    // Skip creating activeTab contentView if requested (e.g., for view migration)
    if (activeTab && !opts?.skipActiveTabContent) {
      activeTabContentView = this.createContentView(activeTab.id, newWindow);
    }

    // merge views into newWindow
    newWindow.contentView.addChildView(topView);
    newWindow.contentView.addChildView(loadingView);
    if (activeTabContentView) {
      newWindow.contentView.addChildView(activeTabContentView);
    }

    // resize view's size when window resizing
    newWindow.on('resize', () => {
      const [width, height] = newWindow.getSize();
      const newBottomHeight = height - topViewHeight;
      const newBottomWidth = width;

      const titlebarView = getTitlebarView(newWindow);
      const contentViews = getContentViews(newWindow);

      if (titlebarView) titlebarView.setBounds({ x: 0, y: 0, height: topViewHeight, width });

      contentViews.forEach((contentView) => contentView.setBounds({ x: 0, y: topViewHeight, width: newBottomWidth, height: newBottomHeight }));
    });

    // Clean up DevTools when window closes (dev mode)
    newWindow.on('close', () => {
      if (!isDev) return;

      const titlebarView = getTitlebarView(newWindow);
      const contentViews = getContentViews(newWindow);
      const allViews = [...(titlebarView ? [titlebarView] : []), ...contentViews];

      allViews.forEach((view) => {
        const wc = view.webContents;
        if (!wc.isDestroyed() && wc.isDevToolsOpened()) {
          wc.closeDevTools();
          logger.debug('Closed DevTools for view {viewType} {tabId}', {
            viewType: view.__viewType,
            tabId: view.__tabId
          });
        }
      });
    });

    // Clean up window reference and storage when closed
    newWindow.on('closed', () => {
      const windowId = this.windows.get(newWindow)?.windowId;
      this.windows.delete(newWindow);

      // Delete window state from storage if not the last window
      // (Last window's state is handled by window-all-closed event in main.ts)
      const remainingWindows = getAllShellWindows();
      if (windowId && remainingWindows.length > 0) {
        // Use async removeItem + immediate flush to ensure deletion
        storage
          .removeItem(STORAGES.APP_WINDOWS(windowId))
          .then(() => {
            // Force flush to disk immediately
            return storage.flush();
          })
          .then(() => {
            logger.info('Deleted window state from storage for {windowId}', { windowId });
          })
          .catch((error) => {
            logger.error('Failed to delete window state: {error}', { error, windowId });
          });
      }

      // Clean up ghost windows if no real app windows remain
      if (remainingWindows.length === 0) {
        logger.info('Last real app window closed, destroying ghost windows');
        BaseWindow.getAllWindows().forEach((w) => {
          if (isGhostWindow(w) && !w.isDestroyed()) {
            w.destroy();
          }
        });
      }

      logger.debug('Cleaned up window reference');
    });

    return newWindow;
  }

  #attachFirstShowGuards(newWindow: BaseWindow): void {
    let windowShown = false;
    let showTimeout: NodeJS.Timeout | null = null;

    const showWindowIfNeeded = (reason: string) => {
      if (windowShown) return;
      if (newWindow.isDestroyed()) return;
      windowShown = true;
      if (newWindow.isMinimized()) newWindow.restore();
      if (!newWindow.isVisible()) newWindow.show();
      newWindow.focus();
      logger.info('new window shown via {reason}', { reason });
      if (showTimeout) {
        clearTimeout(showTimeout);
        showTimeout = null;
      }
    };

    // Timeout fallback in case events are delayed or skipped
    showTimeout = setTimeout(() => {
      logger.warn('ready-to-show timeout; forcing window.show()');
      showWindowIfNeeded('timeout-4s');
    }, 4000);

    const titlebarView = getTitlebarView(newWindow);
    if (!titlebarView) {
      logger.error('Titlebar view not found');
      return;
    }
    const webContents = titlebarView.webContents;

    // WebContent did-finish-load
    webContents.once('did-finish-load', () => {
      logger.info('main window ready to show');
      showWindowIfNeeded('did-finish-load');
    });

    // Ensure visibility even if load fails
    webContents.once('did-fail-load', (_ev, errorCode, errorDescription, validatedURL) => {
      logger.error('Main window failed to load: {errorCode} {errorDescription} {url}', {
        errorCode,
        errorDescription,
        url: validatedURL
      });
      showWindowIfNeeded('did-fail-load');
    });
  }

  #loadWindow(newWindow: BaseWindow, tabs: Tab[]): void {
    const titlebarView = getTitlebarView(newWindow);
    const contentViews = getContentViews(newWindow);

    if (!titlebarView || contentViews.length === 0) {
      logger.error('Missing required views');
      return;
    }

    const loadingView = contentViews.find((v) => v.__tabId === '__loading__');
    const otherContentViews = contentViews.filter((v) => v.__tabId !== '__loading__');

    const topWebContents = titlebarView.webContents;
    let loadingViewWebContents: WebContents | null = null;
    const otherContentViewsWebContents: [string, WebContents][] = otherContentViews.map((otherContentView) => [
      otherContentView.__tabId || '',
      otherContentView.webContents
    ]);

    if (loadingView) loadingViewWebContents = loadingView?.webContents;

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      topWebContents.once('did-frame-finish-load', () => {
        if (!topWebContents.isDestroyed() && !topWebContents.isDevToolsOpened()) {
          topWebContents.openDevTools({ mode: 'detach' });
        }
      });
      otherContentViewsWebContents.forEach(([tabId, otherContentViewsWebContent]) => {
        const currentTab = tabs.find((t) => t.id === tabId);
        if (currentTab) {
          otherContentViewsWebContent.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/${INDEX.CONTENT}#${currentTab.url}`);
          // dev tools
          otherContentViewsWebContent.once('did-frame-finish-load', () => {
            if (!otherContentViewsWebContent.isDestroyed() && !otherContentViewsWebContent.isDevToolsOpened()) {
              otherContentViewsWebContent.openDevTools({ mode: 'detach' });
            }
          });
        }
      });

      topWebContents.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/${INDEX.TITLEBAR}`);

      if (loadingViewWebContents) loadingViewWebContents.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/${INDEX.LOADING}`);
    } else {
      topWebContents.loadURL(titlebarProtocol.getLoadUrl());

      if (loadingViewWebContents) loadingViewWebContents.loadURL(loadingProtocol.getLoadUrl());

      otherContentViewsWebContents.forEach(([tabId, otherContentViewsWebContent]) => {
        const currentTab = tabs.find((t) => t.id === tabId);
        if (currentTab) {
          const tabUrl = currentTab.url.startsWith('/') ? currentTab.url : `/${currentTab.url}`;
          otherContentViewsWebContent.loadURL(`${contentProtocol.getLoadUrl()}#${tabUrl}`);
        }
      });
    }
  }
}

export const shellWindowService = new ShellWindowService();
