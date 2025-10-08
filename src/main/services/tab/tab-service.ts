import type { IpcMainInvokeEvent } from 'electron';

import { Handler, Service } from '@/shared/decorators';
import { getLoggerBy } from '@/shared/logging/helpers';
import { getContentViewByTabId, getWindowByWebContents } from '@/shared/types/view';
import { shellWindowService } from '../window/shell-window-service';

const logger = getLoggerBy('service', 'tab-service');

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
}

export const tabService = new TabService();
