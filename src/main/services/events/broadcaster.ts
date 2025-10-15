import { webContents } from 'electron';
import { UNIFIED_EVENT_CHANNEL, type EventKey, type GlobalEventDataMap } from '@/shared/types/event';
import { getLoggerBy } from '@/shared/logging/helpers';

const logger = getLoggerBy('events', 'broadcaster');

export class EventEmitterService {
  /**
   * Broadcast event to all renderer windows
   * @param event Event name
   * @param data Event data
   */
  emit<K extends EventKey>(event: K, data: GlobalEventDataMap[K]): void {
    const allWebContents = webContents.getAllWebContents();
    let sentCount = 0;

    allWebContents.forEach((wc) => {
      // Only send to web contents that are part of actual application windows
      // This excludes DevTools, extension background pages, etc.
      if (wc.getType() === 'window') {
        wc.send(UNIFIED_EVENT_CHANNEL, event as string, data);
        sentCount++;
      }
    });

    logger.debug('Broadcast event {event} to {count} web contents', {
      event,
      count: sentCount
    });
  }

  /**
   * Broadcast event to all renderer windows except the specified one
   * @param event Event name
   * @param data Event data
   * @param excludeWebContentsId WebContents ID to exclude (typically the sender)
   */
  emitExcept<K extends EventKey>(event: K, data: GlobalEventDataMap[K], excludeWebContentsId?: number): void {
    const allWebContents = webContents.getAllWebContents();
    let sentCount = 0;

    allWebContents.forEach((wc) => {
      // Skip excluded web contents
      if (wc.id === excludeWebContentsId) {
        logger.debug('Excluding webContents {id} from broadcast for event {event}', {
          id: excludeWebContentsId,
          event
        });
        return;
      }

      // Only send to web contents that are part of actual application windows
      // This excludes DevTools, extension background pages, etc.
      if (wc.getType() === 'window') {
        wc.send(UNIFIED_EVENT_CHANNEL, event as string, data);
        sentCount++;
      }
    });

    logger.debug('Broadcast event {event} to {sent}/{total} web contents (excluded: {excluded})', {
      event,
      sent: sentCount,
      total: allWebContents.length,
      excluded: excludeWebContentsId ?? 'none'
    });
  }

  /**
   * Send event to a specific webContents
   * @param webContentsId WebContents ID to send to
   * @param event Event name
   * @param data Event data
   */
  emitTo<K extends EventKey>(webContentsId: number, event: K, data: GlobalEventDataMap[K]): void {
    const targetWebContents = webContents.fromId(webContentsId);

    if (targetWebContents && targetWebContents.getType() === 'window') {
      targetWebContents.send(UNIFIED_EVENT_CHANNEL, event as string, data);
      logger.debug('Sent event {event} to webContents {id}', { event, id: webContentsId });
    } else {
      logger.warn('WebContents {id} not found or not a window for event {event}', { id: webContentsId, event });
    }
  }
}

export const eventEmitterService = new EventEmitterService();
