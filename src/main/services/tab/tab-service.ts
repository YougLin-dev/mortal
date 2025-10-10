import { BaseWindow, type IpcMainInvokeEvent } from 'electron';
import { nanoid } from 'nanoid';

import { Handler, Service } from '@/shared/decorators';
import { storage } from '@/main/core/storage/config';
import { WIN, TITLE_BAR_OVERLAY } from '@/shared/consts/ui';
import { getLoggerBy } from '@/shared/logging/helpers';
import { GLOBAL_EVENTS } from '@/shared/types/event';
import { STORAGES } from '@/shared/types/storage-key';
import { getContentViewByTabId, getTitlebarView, getWindowByWebContents } from '@/shared/types/view';
import type { WindowState } from '@/shared/types/window';
import { eventEmitterService } from '../events/broadcaster';
import { shellWindowService } from '../window/shell-window-service';
import { ghostWindowService } from '../window/ghost-window-service';

const logger = getLoggerBy('service', 'tab-service');

const bottomViewPadding = 4;
const topViewHeight = TITLE_BAR_OVERLAY.DARK.height;

@Service
export class TabService {
  @Handler
  async switchTab(event: IpcMainInvokeEvent, tabId: string, tabUrl: string): Promise<void> {
    logger.info('Switching to tab {tabId} with URL {url}', { tabId, url: tabUrl });

    const window = getWindowByWebContents(event.sender);
    if (!window) {
      logger.error('Window not found for webContents {id}', { id: event.sender.id });
      return;
    }

    let contentView = getContentViewByTabId(window, tabId);

    if (!contentView) {
      logger.debug('Creating new WebContentsView for tab {tabId}', { tabId });

      const loadingStartTime = Date.now();
      const MIN_LOADING_TIME = 50;

      contentView = shellWindowService.createContentView(tabId, window);

      if (!contentView) return;

      const loadingView = getContentViewByTabId(window, '__loading__');
      if (loadingView) {
        shellWindowService.bringViewToFront(window, loadingView);
      }

      shellWindowService
        .loadContentView(contentView, tabUrl)
        .then(() => {
          const elapsedTime = Date.now() - loadingStartTime;
          const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

          setTimeout(() => {
            if (!window.isDestroyed()) {
              window.contentView.addChildView(contentView!);
              shellWindowService.bringViewToFront(window, contentView!);
            }
          }, remainingTime);
        })
        .catch((error) => {
          logger.error('Failed to load view: {error}', { error, tabId });

          const elapsedTime = Date.now() - loadingStartTime;
          const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

          setTimeout(() => {
            if (!window.isDestroyed()) {
              window.contentView.addChildView(contentView!);
              shellWindowService.bringViewToFront(window, contentView!);
            }
          }, remainingTime);
        });

      return;
    }

    shellWindowService.bringViewToFront(window, contentView);
  }

  @Handler
  async closeTab(event: IpcMainInvokeEvent, tabId: string): Promise<void> {
    logger.info('Closing tab {tabId}', { tabId });

    const window = getWindowByWebContents(event.sender);
    if (!window) {
      logger.error('Window not found for webContents {id}', { id: event.sender.id });
      return;
    }

    const contentView = getContentViewByTabId(window, tabId);
    if (!contentView) {
      logger.warn('Content view not found for tab {tabId}', { tabId });
      return;
    }

    shellWindowService.destroyContentView(window, contentView);
  }

  @Handler
  async dropAtPointer(
    event: IpcMainInvokeEvent,
    tabId: string,
    pointer: { screenX: number; screenY: number }
  ): Promise<{ action: 'merged'; targetWindowId: string } | { action: 'detached'; newWindowId: string } | null> {
    logger.info('Dropping tab {tabId} at pointer ({x}, {y})', { tabId, x: pointer.screenX, y: pointer.screenY });

    const originWindow = getWindowByWebContents(event.sender);
    if (!originWindow) {
      logger.error('Origin window not found for webContents {id}', { id: event.sender.id });
      return null;
    }

    const originWindowId = shellWindowService.getWindowId(originWindow);
    if (!originWindowId) {
      logger.error('Origin windowId not found');
      return null;
    }

    // Get insert target from ghost window service
    const insertTarget = ghostWindowService.getCurrentInsertTarget();

    // Find target window at pointer position
    const targetWindowData = shellWindowService.findWindowAtPoint(pointer.screenX, pointer.screenY);

    if (targetWindowData) {
      const { win: targetWindow, windowId: targetWindowId } = targetWindowData;

      // Check if pointer is in titlebar area and not the same window
      if (targetWindowId !== originWindowId && shellWindowService.isPointInTitlebar(targetWindow, pointer.screenX, pointer.screenY)) {
        logger.info('Merging tab {tabId} into window {targetWindowId}', { tabId, targetWindowId });

        const toIndex = insertTarget?.windowId === targetWindowId ? insertTarget.insertIndex : undefined;
        const result = await this.moveTabToExistingWindow(originWindow, targetWindow, tabId, { toIndex });
        if (result) {
          return { action: 'merged', targetWindowId };
        }
        logger.error('Failed to merge tab into existing window');
        return null;
      }
    }

    // Fall back to creating new window
    logger.info('No valid drop target found, creating new window');
    const detachResult = await this.detachToNewWindow(event, tabId, pointer);
    if (detachResult) {
      return { action: 'detached', newWindowId: detachResult.newWindowId };
    }
    return null;
  }

  @Handler
  async detachToNewWindow(
    event: IpcMainInvokeEvent,
    tabId: string,
    pointer?: { screenX: number; screenY: number }
  ): Promise<{ newWindowId: string } | null> {
    logger.info('Detaching tab {tabId} to new window', { tabId });

    const originWindow = getWindowByWebContents(event.sender);
    if (!originWindow) {
      logger.error('Origin window not found for webContents {id}', { id: event.sender.id });
      return null;
    }

    const view = getContentViewByTabId(originWindow, tabId);
    const hasView = !!view;

    const originWindowId = shellWindowService.getWindowId(originWindow);
    if (!originWindowId) {
      logger.error('Origin windowId not found');
      return null;
    }

    const originState = storage.getSync(STORAGES.APP_WINDOWS(originWindowId));
    if (!originState) {
      logger.error('Origin window state not found for {windowId}', { windowId: originWindowId });
      return null;
    }

    const tab = originState.tabs.find((t) => t.id === tabId);
    if (!tab) {
      logger.error('Tab not found in origin state: {tabId}', { tabId });
      return null;
    }

    // Create new window state
    const newWindowId = nanoid(8);
    const originBounds = originWindow.getBounds();
    const newState: WindowState = {
      windowId: newWindowId,
      type: 'detached',
      x: pointer?.screenX ?? originBounds.x + 30,
      y: pointer?.screenY ?? originBounds.y + 30,
      width: Math.max(WIN.MIN_WIDTH + 200, 800),
      height: Math.max(WIN.MIN_HEIGHT + 200, 600),
      isMaximized: false,
      isMinimized: false,
      isFullScreen: false,
      isAlwaysOnTop: originState.isAlwaysOnTop,
      tabs: [{ ...tab, isActive: true }]
    };

    logger.debug('Creating new window with state', { newWindowId, position: { x: newState.x, y: newState.y } });

    // Create window; skip active tab contentView only if we'll migrate an existing view
    const newWindow = shellWindowService.createWindow(newState, { skipActiveTabContent: hasView });

    // Migrate the view from origin to new window (only if it exists)
    if (hasView) {
      try {
        originWindow.contentView.removeChildView(view);
        logger.debug('Removed view from origin window');

        // Update view bounds for new window
        const [newWidth, newHeight] = newWindow.getSize();
        const bottomWidth = newWidth - bottomViewPadding * 2;
        const bottomHeight = newHeight - topViewHeight - bottomViewPadding;
        view.setBounds({
          x: bottomViewPadding,
          y: topViewHeight,
          width: bottomWidth,
          height: bottomHeight
        });

        shellWindowService.bringViewToFront(newWindow, view);
        logger.debug('Added view to new window and brought to front');

        // Notify the migrated view of its new window state
        eventEmitterService.emitTo(view.webContents.id, GLOBAL_EVENTS.WINDOW_STATE_UPDATE, {
          windowState: newState
        });
        logger.debug('Emitted WINDOW_STATE_UPDATE to migrated view');

        // Also re-emit on reload to handle page refresh
        view.webContents.once('did-finish-load', () => {
          if (!view.webContents.isDestroyed()) {
            eventEmitterService.emitTo(view.webContents.id, GLOBAL_EVENTS.WINDOW_STATE_UPDATE, {
              windowState: newState
            });
            logger.debug('Re-emitted WINDOW_STATE_UPDATE after view reload');
          }
        });
      } catch (error) {
        logger.error('Failed to migrate view: {error}', { error });
        return null;
      }
    } else {
      // No view to migrate; contentView was auto-created and loaded in createWindow
      logger.debug('No existing view to migrate; new window created with fresh contentView');
      const newView = getContentViewByTabId(newWindow, tabId);
      if (newView) {
        shellWindowService.bringViewToFront(newWindow, newView);
      }
    }

    // Update origin window state (remove the detached tab)
    const removedIndex = originState.tabs.findIndex((t) => t.id === tabId);
    const wasActive = originState.tabs[removedIndex]?.isActive;
    const newTabs = originState.tabs.filter((t) => t.id !== tabId);

    if (wasActive && newTabs.length > 0) {
      const newActiveIndex = Math.min(removedIndex, newTabs.length - 1);
      newTabs.forEach((t, i) => {
        t.isActive = i === newActiveIndex;
      });
    }

    storage.setSync(STORAGES.APP_WINDOWS(originWindowId), {
      ...originState,
      tabs: newTabs
    });

    logger.debug('Updated origin window state, removed tab {tabId}', { tabId });

    // Notify origin window's titlebar to update UI
    const titlebarView = getTitlebarView(originWindow);
    if (titlebarView) {
      eventEmitterService.emitTo(titlebarView.webContents.id, GLOBAL_EVENTS.TAB_DETACHED, {
        tabId,
        newWindowId
      });
      logger.debug('Emitted TAB_DETACHED event to origin titlebar');
    }

    // Show and focus new window
    if (!newWindow.isDestroyed()) {
      newWindow.show();
      newWindow.focus();
    }

    logger.info('Successfully detached tab {tabId} to new window {newWindowId}', { tabId, newWindowId });

    return { newWindowId };
  }

  private async moveTabToExistingWindow(originWin: BaseWindow, targetWin: BaseWindow, tabId: string, opts?: { toIndex?: number }): Promise<boolean> {
    logger.info('Moving tab {tabId} from origin to target window', { tabId });

    const originWindowId = shellWindowService.getWindowId(originWin);
    const targetWindowId = shellWindowService.getWindowId(targetWin);

    if (!originWindowId || !targetWindowId) {
      logger.error('Failed to get window IDs');
      return false;
    }

    const originState = storage.getSync(STORAGES.APP_WINDOWS(originWindowId));
    const targetState = storage.getSync(STORAGES.APP_WINDOWS(targetWindowId));

    if (!originState || !targetState) {
      logger.error('Failed to get window states');
      return false;
    }

    const tab = originState.tabs.find((t) => t.id === tabId);
    if (!tab) {
      logger.error('Tab not found in origin state: {tabId}', { tabId });
      return false;
    }

    const view = getContentViewByTabId(originWin, tabId);

    try {
      // Remove tab from origin state
      const removedIndex = originState.tabs.findIndex((t) => t.id === tabId);
      const wasActive = originState.tabs[removedIndex]?.isActive;
      const newOriginTabs = originState.tabs.filter((t) => t.id !== tabId);

      if (wasActive && newOriginTabs.length > 0) {
        const newActiveIndex = Math.min(removedIndex, newOriginTabs.length - 1);
        newOriginTabs.forEach((t, i) => {
          t.isActive = i === newActiveIndex;
        });
      }

      // Add tab to target state (make it active)
      const newTargetTabs = targetState.tabs.map((t) => ({ ...t, isActive: false }));
      const insertIndex = opts?.toIndex !== undefined ? Math.min(opts.toIndex, newTargetTabs.length) : newTargetTabs.length;
      newTargetTabs.splice(insertIndex, 0, { ...tab, isActive: true });

      // Migrate view if it exists
      if (view) {
        originWin.contentView.removeChildView(view);
        logger.debug('Removed view from origin window');

        // Update view bounds for target window
        const [targetWidth, targetHeight] = targetWin.getSize();
        const bottomWidth = targetWidth - bottomViewPadding * 2;
        const bottomHeight = targetHeight - topViewHeight - bottomViewPadding;
        view.setBounds({
          x: bottomViewPadding,
          y: topViewHeight,
          width: bottomWidth,
          height: bottomHeight
        });

        shellWindowService.bringViewToFront(targetWin, view);
        logger.debug('Added view to target window and brought to front');

        // Notify the migrated view of its new window state
        const updatedTargetState = { ...targetState, tabs: newTargetTabs };
        eventEmitterService.emitTo(view.webContents.id, GLOBAL_EVENTS.WINDOW_STATE_UPDATE, {
          windowState: updatedTargetState
        });
        logger.debug('Emitted WINDOW_STATE_UPDATE to migrated view');

        // Re-emit on reload to handle page refresh
        view.webContents.once('did-finish-load', () => {
          if (!view.webContents.isDestroyed()) {
            eventEmitterService.emitTo(view.webContents.id, GLOBAL_EVENTS.WINDOW_STATE_UPDATE, {
              windowState: updatedTargetState
            });
            logger.debug('Re-emitted WINDOW_STATE_UPDATE after view reload');
          }
        });
      }

      // Update storage for both windows
      storage.setSync(STORAGES.APP_WINDOWS(originWindowId), {
        ...originState,
        tabs: newOriginTabs
      });

      storage.setSync(STORAGES.APP_WINDOWS(targetWindowId), {
        ...targetState,
        tabs: newTargetTabs
      });

      logger.debug('Updated window states in storage');

      // Notify origin window's titlebar
      const originTitlebarView = getTitlebarView(originWin);
      if (originTitlebarView) {
        eventEmitterService.emitTo(originTitlebarView.webContents.id, GLOBAL_EVENTS.TAB_DETACHED, {
          tabId,
          newWindowId: targetWindowId
        });
        logger.debug('Emitted TAB_DETACHED to origin titlebar');
      }

      // Notify target window's titlebar
      const targetTitlebarView = getTitlebarView(targetWin);
      if (targetTitlebarView) {
        eventEmitterService.emitTo(targetTitlebarView.webContents.id, GLOBAL_EVENTS.TAB_ATTACHED, {
          tabId,
          tab: { ...tab, isActive: true },
          originWindowId,
          toIndex: insertIndex
        });
        logger.debug('Emitted TAB_ATTACHED to target titlebar');
      }

      // Focus target window
      if (!targetWin.isDestroyed()) {
        targetWin.focus();
      }

      logger.info('Successfully moved tab {tabId} to target window at index {index}', { tabId, index: insertIndex });
      return true;
    } catch (error) {
      logger.error('Failed to move tab: {error}', { error, tabId });
      return false;
    }
  }
}

export const tabService = new TabService();
