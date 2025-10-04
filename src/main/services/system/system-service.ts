import type { IpcMainInvokeEvent } from 'electron';
import { Handler, Service, Route } from '@/shared/decorators';
import * as fs from 'fs';

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

  @Route('POST', '/api/stream-count')
  async streamCountRoute(request: Request): Promise<Response> {
    const { max = 10 } = await request.json();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const encoder = new TextEncoder();
          for (let i = 1; i <= max; i++) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            const data = JSON.stringify({ count: i, timestamp: Date.now() });
            controller.enqueue(encoder.encode(data + '\n'));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked'
      }
    });
  }

  @Route('GET', '/api/hello')
  async helloRoute(_request: Request): Promise<Response> {
    return Response.json({ message: 'Hello from IPC Router!', timestamp: Date.now() });
  }
}

export const systemService = new SystemService();
