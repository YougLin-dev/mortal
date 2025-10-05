/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain, type IpcMainEvent } from 'electron';
import { getRoutes, getServiceName } from '@/shared/decorators';
import { services } from '@/main/services';
import type {
  IpcRequest,
  IpcResponse,
  IpcStreamChunk,
  IpcStreamEnd,
  IpcStreamError,
  IpcAbortRequest,
  SerializedBody,
  JsonValue
} from '@/shared/types/router';
import {
  FETCH_REQUEST_CHANNEL,
  FETCH_RESPONSE_CHANNEL,
  FETCH_STREAM_DATA_CHANNEL,
  FETCH_STREAM_END_CHANNEL,
  FETCH_STREAM_ERROR_CHANNEL,
  FETCH_ABORT_CHANNEL
} from '@/shared/types/fetch';
import { getIpcRouterLogger } from '@/shared/logging/helpers';

const logger = getIpcRouterLogger().getChild('setup');

interface RouteEntry {
  method: string;
  path: string;
  handler: Function;
  service: any;
}

const routes: RouteEntry[] = [];

const activeStreams = new Map<string, AbortController>();

export function setupRouter() {
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
      logger.info('Registered route {method} {path} -> {service}.{handler}', {
        method: route.method,
        path: route.path,
        service: serviceName,
        handler: route.handler.name
      });
    }
  });

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

      const abortController = new AbortController();
      activeStreams.set(ipcRequest.id, abortController);

      const fullUrl = `http://localhost${ipcRequest.url}`;
      const body = typeof ipcRequest.body === 'string' ? ipcRequest.body : ipcRequest.body != null ? JSON.stringify(ipcRequest.body) : undefined;

      const requestHeaders = new Headers(ipcRequest.headers);
      if (body && ipcRequest.body && typeof ipcRequest.body !== 'string' && !requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json');
      }

      const request = new Request(fullUrl, {
        method: ipcRequest.method,
        headers: requestHeaders,
        body,
        signal: abortController.signal
      });

      const response: Response = await route.handler(request);

      if (response.body && typeof response.body.getReader === 'function') {
        logger.debug('Handling stream response {id}', { id: ipcRequest.id });
        await handleStreamResponse(event, ipcRequest.id, response);
      } else {
        await handleRegularResponse(event, ipcRequest.id, response);
      }
    } catch (error) {
      logger.error('Router error: {error}', { error });
      activeStreams.delete(ipcRequest.id);
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

  ipcMain.on(FETCH_ABORT_CHANNEL, (_event: IpcMainEvent, abortRequest: IpcAbortRequest) => {
    logger.info('Abort request received {id}', { id: abortRequest.id });
    const controller = activeStreams.get(abortRequest.id);
    if (controller) {
      logger.warn('Aborting stream {id}', { id: abortRequest.id });
      controller.abort();
    } else {
      logger.warn('No active stream found {id}', { id: abortRequest.id });
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

async function handleRegularResponse(event: IpcMainEvent, requestId: string, response: Response) {
  logger.debug('Handling regular response {id}', { id: requestId });
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const contentType = response.headers.get('Content-Type') || '';
  let body: SerializedBody;

  if (contentType.includes('application/json')) {
    body = (await response.json()) as JsonValue;
  } else {
    body = await response.text();
  }

  activeStreams.delete(requestId);

  sendResponse(event, {
    id: requestId,
    status: response.status,
    statusText: response.statusText,
    headers,
    body
  });
}

async function handleStreamResponse(event: IpcMainEvent, requestId: string, response: Response) {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const abortController = activeStreams.get(requestId);
  if (!abortController) {
    logger.error('No AbortController found for request {id}', { id: requestId });
    return;
  }

  sendResponse(event, {
    id: requestId,
    status: response.status,
    statusText: response.statusText,
    headers,
    isStream: true
  });

  try {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      if (abortController.signal.aborted) {
        logger.info('Stream aborted {id}', { id: requestId });
        reader.cancel('Request aborted by client');
        activeStreams.delete(requestId);
        if (!event.sender.isDestroyed()) {
          const end: IpcStreamEnd = { id: requestId };
          event.sender.send(FETCH_STREAM_END_CHANNEL, end);
        }
        break;
      }

      const { done, value } = await reader.read();

      if (done) {
        activeStreams.delete(requestId);
        if (!event.sender.isDestroyed()) {
          const end: IpcStreamEnd = { id: requestId };
          event.sender.send(FETCH_STREAM_END_CHANNEL, end);
        }
        break;
      }

      if (!event.sender.isDestroyed()) {
        const text = decoder.decode(value, { stream: true });
        const chunk: IpcStreamChunk = { id: requestId, data: text };
        event.sender.send(FETCH_STREAM_DATA_CHANNEL, chunk);
      }
    }
  } catch (error) {
    activeStreams.delete(requestId);
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
