/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import { UNIFIED_EVENT_CHANNEL } from '@/shared/types/event';

class IPCEventRouter {
  handlers: Map<string, (event: IpcRendererEvent, realChannel: string, data: any) => void>;
  constructor() {
    this.handlers = new Map();

    ipcRenderer.on(UNIFIED_EVENT_CHANNEL, (event, type, data) => {
      this.handleMessage(type, event, data);
    });
  }

  on(pattern: string, handler: (event: IpcRendererEvent, realChannel: string, data: any) => void) {
    this.handlers.set(pattern, handler);
  }

  handleMessage(type: string, event: IpcRendererEvent, data: any) {
    for (const [pattern, handler] of this.handlers) {
      if (this.matchPattern(type, pattern)) {
        handler(event, type, data);
      }
    }
  }

  matchPattern(str: string, pattern: string) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(str);
  }
}

export const ipcEventRouter = new IPCEventRouter();
