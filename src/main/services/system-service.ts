import type { IpcMainInvokeEvent } from 'electron';
import { Handler, Service } from '@/shared/decorators';
import * as fs from 'fs';
import { mathService } from './math-service';

@Service
export class SystemService {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  @Handler
  save(event: IpcMainInvokeEvent, data: string) {
    console.log(`Saving data from ${event.processId}:`, data);
    fs.writeFileSync('data.txt', data);
  }

  @Handler
  log(event: IpcMainInvokeEvent, message: string, level: 'info' | 'warn' | 'error' = 'info') {
    console.log(`[${level.toUpperCase()}] [PID:${event.processId}] ${message}`);
  }

  @Handler
  notify(event: IpcMainInvokeEvent, title: string, message: string) {
    console.log(`Notification from ${event.processId}: ${title} - ${message}`);
  }

  @Handler
  add(event: IpcMainInvokeEvent, x: number, y: number): number {
    const result = mathService.add(x, y);
    console.log(`Computing ${x} + ${y} = ${result} for PID:${event.processId}`);
    return result;
  }

  @Handler
  getSystemInfo(event: IpcMainInvokeEvent): {
    platform: string;
    timestamp: number;
    uptime: number;
    requesterId: number;
  } {
    return {
      platform: process.platform,
      timestamp: Date.now(),
      uptime: process.uptime(),
      requesterId: event.processId
    };
  }

  @Handler
  async fetchUserData(event: IpcMainInvokeEvent, userId: string): Promise<{ id: string; name: string; lastLogin: number; requesterId: number }> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      id: userId,
      name: `User ${userId}`,
      lastLogin: Date.now() - Math.random() * 86400000,
      requesterId: event.processId
    };
  }

  @Handler
  multiply(event: IpcMainInvokeEvent, x: number, y: number): number {
    const result = x * y;
    console.log(`Computing ${x} × ${y} = ${result} for PID:${event.processId}`);
    return result;
  }
}

export const systemService = new SystemService();
