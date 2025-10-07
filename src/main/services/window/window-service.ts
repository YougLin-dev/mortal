import type { IpcMainInvokeEvent } from 'electron';
import { BrowserWindow, nativeTheme } from 'electron';
import path from 'node:path';
import { Handler, Service } from '@/shared/decorators';
import { AppProtocol } from '@/main/core/protocols/app-protocol';
import { TITLE_BAR_OVERLAY, WIN } from '@/shared/consts/ui';
import { is, platform } from '@electron-toolkit/utils';
import { WindowStateManager } from '@/main/services/window/window-state-manager';
import { toArgument } from '@/shared/utils/preload-utils';
import { storage } from '@/main/core/storage/config';
import { STORAGES } from '@/shared/types/storage-key';
import { getLoggerBy } from '@/shared/logging/helpers';

const logger = getLoggerBy('service', 'window', 'lifecycle');

@Service
export class WindowService {
  private mainWindowProtocol: AppProtocol;

  constructor() {
    this.mainWindowProtocol = new AppProtocol(
      'main',
      'localhost',
      import.meta.dirname,
      path.join(import.meta.dirname, `./renderer/${MAIN_WINDOW_VITE_NAME}`)
    );
  }

  @Handler
  setAlwaysOnTop(_event: IpcMainInvokeEvent, alwaysOnTop: boolean): void {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.setAlwaysOnTop(alwaysOnTop);
    }
  }

  async createMainWindow(): Promise<BrowserWindow> {
    const mainWindowState = this.createMainWindowState();
    const mainWindow = this.buildMainWindow(mainWindowState);
    mainWindowState.manage(mainWindow);
    this.attachFirstShowGuards(mainWindow);
    this.loadMainWindow(mainWindow);
    return mainWindow;
  }

  setupProtocolHandler(): void {
    this.mainWindowProtocol.setupHandler();
  }

  getAllWindows(): BrowserWindow[] {
    return BrowserWindow.getAllWindows();
  }

  getFocusedWindow(): BrowserWindow | null {
    return BrowserWindow.getFocusedWindow();
  }

  private createMainWindowState(): WindowStateManager {
    return new WindowStateManager({
      windowId: 'main',
      restoreFullScreen: false,
      restoreMaximized: true,
      defaultState: {
        width: WIN.MIN_WIDTH,
        height: WIN.MIN_HEIGHT,
        isFullScreen: false,
        type: 'main'
      }
    });
  }

  private buildMainWindow(mainWindowState: WindowStateManager): BrowserWindow {
    const { shouldUseDarkColors } = nativeTheme;
    return new BrowserWindow({
      show: false,
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height,
      minWidth: WIN.MIN_WIDTH,
      minHeight: WIN.MIN_HEIGHT,
      fullscreen: mainWindowState.isFullScreen,
      alwaysOnTop: mainWindowState.isAlwaysOnTop,
      backgroundColor: platform.isMacOS ? undefined : nativeTheme.shouldUseDarkColors ? '#1f2020' : '#f4f3f2',
      autoHideMenuBar: true,
      titleBarStyle: platform.isMacOS ? 'hiddenInset' : 'hidden',
      titleBarOverlay: !platform.isMacOS ? (shouldUseDarkColors ? TITLE_BAR_OVERLAY.DARK : TITLE_BAR_OVERLAY.LIGHT) : undefined,
      darkTheme: nativeTheme.shouldUseDarkColors,
      frame: false,
      transparent: false,
      webPreferences: {
        preload: this.mainWindowProtocol.getPreloadFile(),
        nodeIntegration: false,
        contextIsolation: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
        devTools: is.dev,
        additionalArguments: [
          toArgument('windowState', mainWindowState.windowState),
          toArgument('isMac', platform.isMacOS),
          toArgument('locale', storage.getSync(STORAGES.APP_I18N_LOCALE))
        ]
      },
      icon: path.join(import.meta.dirname, './resources/images/icon.png')
    });
  }

  private attachFirstShowGuards(mainWindow: BrowserWindow): void {
    let windowShown = false;
    let showTimeout: NodeJS.Timeout | null = null;

    const showWindowIfNeeded = (reason: string) => {
      if (windowShown) return;
      if (mainWindow.isDestroyed()) return;
      windowShown = true;
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
      logger.info('main window shown via {reason}', { reason });
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

    // Primary: ready-to-show
    mainWindow.once('ready-to-show', () => {
      logger.info('main window ready to show');
      showWindowIfNeeded('ready-to-show');
    });

    // Fallback: did-finish-load (covers rare cases where ready-to-show does not fire)
    mainWindow.webContents.once('did-finish-load', () => {
      showWindowIfNeeded('did-finish-load');
    });

    // Ensure visibility even if load fails
    mainWindow.webContents.once('did-fail-load', (_ev, errorCode, errorDescription, validatedURL) => {
      logger.error('Main window failed to load: {errorCode} {errorDescription} {url}', {
        errorCode,
        errorDescription,
        url: validatedURL
      });
      showWindowIfNeeded('did-fail-load');
    });
  }

  private loadMainWindow(mainWindow: BrowserWindow): void {
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
      mainWindow.webContents.on('did-frame-finish-load', () => {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      });
    } else {
      mainWindow.loadURL(this.mainWindowProtocol.getLoadUrl());
    }
  }
}

export const windowService = new WindowService();
