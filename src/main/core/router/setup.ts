/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain, type IpcMainEvent } from 'electron';
import { getRoutes, getServiceName } from '@/shared/decorators';
import { services } from '@/main/services';
import type { IpcRequest, IpcResponse, IpcStreamChunk, IpcStreamEnd, IpcStreamError } from '@/shared/types/router';
import {
  FETCH_REQUEST_CHANNEL,
  FETCH_RESPONSE_CHANNEL,
  FETCH_STREAM_DATA_CHANNEL,
  FETCH_STREAM_END_CHANNEL,
  FETCH_STREAM_ERROR_CHANNEL
} from '@/shared/types/fetch';

interface RouteEntry {
  method: string;
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  handler: Function;
  service: any;
}

const routes: RouteEntry[] = [];

export function setupRouter() {
  // Collect all routes from services
  services.forEach((service) => {
    const Service = service.constructor;
    const serviceRoutes = getRoutes(Service);
    const serviceName = getServiceName(Service);

    if (!serviceRoutes || !serviceName) {
      return;
    }

    for (const route of serviceRoutes) {
      const method = route.handler;

      routes.push({
        method: route.method,
        path: route.path,
        handler: method.bind(service),
        service
      });
      console.log(`Registered route: ${route.method} ${route.path} -> ${serviceName}.${route.handler.name}`);
    }
  });

  // Register IPC handlers for routing
  ipcMain.on(FETCH_REQUEST_CHANNEL, async (event: IpcMainEvent, ipcRequest: IpcRequest) => {
    try {
      const route = findRoute(ipcRequest.method, ipcRequest.url);

      if (!route) {
        sendResponse(event, {
          id: ipcRequest.id,
          status: 404,
          statusText: 'Not Found',
          headers: { 'Content-Type': 'application/json' },
          body: { error: 'Route not found' }
        });
        return;
      }

      // Construct standard Request object
      const fullUrl = `http://localhost${ipcRequest.url}`;
      const request = new Request(fullUrl, {
        method: ipcRequest.method,
        headers: new Headers(ipcRequest.headers),
        body: ipcRequest.body ? JSON.stringify(ipcRequest.body) : undefined
      });

      // Call handler with standard Request
      const response: Response = await route.handler(request);

      // Check if response body is a ReadableStream
      if (response.body && typeof response.body.getReader === 'function') {
        await handleStreamResponse(event, ipcRequest.id, response);
      } else {
        // Regular response
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        const contentType = response.headers.get('Content-Type') || '';
        let body: any;

        if (contentType.includes('application/json')) {
          body = await response.json();
        } else {
          body = await response.text();
        }

        sendResponse(event, {
          id: ipcRequest.id,
          status: response.status,
          statusText: response.statusText,
          headers,
          body
        });
      }
    } catch (error) {
      console.error('Router error:', error);
      sendResponse(event, {
        id: ipcRequest.id,
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'application/json' },
        body: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  });
}

function findRoute(method: string, url: string): RouteEntry | undefined {
  return routes.find((r) => r.method === method && r.path === url);
}

function sendResponse(event: IpcMainEvent, response: IpcResponse) {
  if (!event.sender.isDestroyed()) {
    event.sender.send(FETCH_RESPONSE_CHANNEL, response);
  }
}

async function handleStreamResponse(event: IpcMainEvent, requestId: string, response: Response) {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Send initial response headers
  sendResponse(event, {
    id: requestId,
    status: response.status,
    statusText: response.statusText,
    headers,
    isStream: true
  });

  // Stream the response body
  try {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        if (!event.sender.isDestroyed()) {
          const end: IpcStreamEnd = { id: requestId };
          event.sender.send(FETCH_STREAM_END_CHANNEL, end);
        }
        break;
      }

      if (!event.sender.isDestroyed()) {
        const text = decoder.decode(value, { stream: true });
        // Try to parse as JSON, otherwise send as text
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }

        const chunk: IpcStreamChunk = { id: requestId, data };
        event.sender.send(FETCH_STREAM_DATA_CHANNEL, chunk);
      }
    }
  } catch (error) {
    if (!event.sender.isDestroyed()) {
      const errorMsg: IpcStreamError = {
        id: requestId,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      };
      event.sender.send(FETCH_STREAM_ERROR_CHANNEL, errorMsg);
    }
  }
}
