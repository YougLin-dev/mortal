import { BrowserWindow } from 'electron';
import { UNIFIED_EVENT_CHANNEL, type GlobalEventDataMap } from '@/shared/types/event';
import { getLoggerBy } from '@/shared/logging/helpers';

const logger = getLoggerBy('events', 'broadcaster');

export class EventEmitterService {
  /**
   * Broadcast event to all renderer windows
   */
  emit<K extends keyof GlobalEventDataMap>(event: K, data: GlobalEventDataMap[K]): void {
    const allWindows = BrowserWindow.getAllWindows();

    allWindows.forEach((window) => {
      window.webContents.send(UNIFIED_EVENT_CHANNEL, event as string, data);
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
    const allWindows = BrowserWindow.getAllWindows();
    let sentCount = 0;

    allWindows.forEach((window) => {
      // Skip the sender window to avoid circular updates
      if (excludeWebContentsId !== undefined && window.webContents.id === excludeWebContentsId) {
        logger.debug('Skipping sender window {id} for event {event}', {
          id: excludeWebContentsId,
          event
        });
        return;
      }

      window.webContents.send(UNIFIED_EVENT_CHANNEL, event as string, data);
      sentCount++;
    });

    logger.debug('Broadcast event {event} to {sent}/{total} windows (excluded: {excluded})', {
      event,
      sent: sentCount,
      total: allWindows.length,
      excluded: excludeWebContentsId ?? 'none'
    });
  }
}

export const eventEmitterService = new EventEmitterService();
