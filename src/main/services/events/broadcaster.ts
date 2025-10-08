import { BaseWindow, WebContentsView } from 'electron';
import { UNIFIED_EVENT_CHANNEL, type GlobalEventDataMap } from '@/shared/types/event';
import { getLoggerBy } from '@/shared/logging/helpers';

const logger = getLoggerBy('events', 'broadcaster');

export class EventEmitterService {
  /**
   * Broadcast event to all renderer windows
   * @param event Event name
   * @param data Event data
   */
  emit<K extends keyof GlobalEventDataMap>(event: K, data: GlobalEventDataMap[K]): void {
    const allWindows = BaseWindow.getAllWindows();

    allWindows.forEach((window) => {
      // Send to all views in the window
      window.contentView.children.forEach((view) => {
        if (view instanceof WebContentsView && view.webContents) {
          view.webContents.send(UNIFIED_EVENT_CHANNEL, event as string, data);
        }
      });
    });

    logger.debug('Broadcast event {event} to {count} windows', {
      event,
      count: allWindows.length
    });
  }

  /**
   * Broadcast event to all renderer windows except the specified one
   * @param event Event name
   * @param data Event data
   * @param excludeWebContentsId WebContents ID to exclude (typically the sender)
   */
  emitExcept<K extends keyof GlobalEventDataMap>(event: K, data: GlobalEventDataMap[K], excludeWebContentsId?: number): void {
    const allWindows = BaseWindow.getAllWindows();
    let sentCount = 0;

    allWindows.forEach((window) => {
      // Send to all views in the window
      window.contentView.children.forEach((view) => {
        if (!(view instanceof WebContentsView) || !view.webContents) return;

        // Skip the sender window to avoid circular updates
        if (excludeWebContentsId !== undefined && view.webContents.id === excludeWebContentsId) {
          logger.debug('Skipping sender window {id} for event {event}', {
            id: excludeWebContentsId,
            event
          });
          return;
        }

        view.webContents.send(UNIFIED_EVENT_CHANNEL, event as string, data);
        sentCount++;
      });
    });

    logger.debug('Broadcast event {event} to {sent}/{total} windows (excluded: {excluded})', {
      event,
      sent: sentCount,
      total: allWindows.length,
      excluded: excludeWebContentsId ?? 'none'
    });
  }

  /**
   * Send event to a specific webContents
   * @param webContentsId WebContents ID to send to
   * @param event Event name
   * @param data Event data
   */
  emitTo<K extends keyof GlobalEventDataMap>(webContentsId: number, event: K, data: GlobalEventDataMap[K]): void {
    const allWindows = BaseWindow.getAllWindows();

    for (const window of allWindows) {
      for (const view of window.contentView.children) {
        if (view instanceof WebContentsView && view.webContents && view.webContents.id === webContentsId) {
          view.webContents.send(UNIFIED_EVENT_CHANNEL, event as string, data);
          logger.debug('Sent event {event} to webContents {id}', { event, id: webContentsId });
          return;
        }
      }
    }

    logger.warn('WebContents {id} not found for event {event}', { id: webContentsId, event });
  }
}

export const eventEmitterService = new EventEmitterService();
