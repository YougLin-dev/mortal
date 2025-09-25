import { BrowserWindow } from 'electron';
import { UNIFIED_EVENT_CHANNEL, type GlobalEventDataMap } from '@/shared/types/event';

export class EventEmitterService {
  emit<K extends keyof GlobalEventDataMap>(event: K, data: GlobalEventDataMap[K]): void {
    const allWindows = BrowserWindow.getAllWindows();

    allWindows.forEach((window) => {
      window.webContents.send(UNIFIED_EVENT_CHANNEL, event as string, data);
    });
  }
}

export const eventEmitterService = new EventEmitterService();
