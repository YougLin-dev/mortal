import type { IpcMainInvokeEvent } from 'electron';
import { BrowserWindow } from 'electron';
import { Handler, Service } from '@/shared/decorators';

@Service
export class WindowService {
  @Handler
  setAlwaysOnTop(_event: IpcMainInvokeEvent, alwaysOnTop: boolean): void {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.setAlwaysOnTop(alwaysOnTop);
    }
  }
}

export const windowService = new WindowService();
