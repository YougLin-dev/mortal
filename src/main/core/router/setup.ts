import { ipcMain, type IpcMainEvent } from 'electron';
import { getRoutes, getServiceName } from '@/shared/decorators';
import { headersToObject } from '@/shared/utils/fetch-utils';
import { services } from '@/main/services';
import type {
  IpcRequest,
  IpcResponse,
  IpcStreamChunk,
  IpcStreamEnd,
  IpcStreamError,
  IpcStreamReady,
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
  FETCH_STREAM_READY_CHANNEL,
  FETCH_ABORT_CHANNEL
} from '@/shared/types/fetch';
import { getIpcRouterLogger } from '@/shared/logging/helpers';
import type { Class } from 'node_modules/zod/v4/core/util.d.cts';

const logger = getIpcRouterLogger();
const setupLogger = logger.getChild('setup');
const requestLogger = logger.getChild('req');

interface RouteEntry {
  method: string;
  path: string;
  handler: Function;
  service: Class;
}

const routes: RouteEntry[] = [];

const activeStreams = new Map<string, AbortController>();
const streamReadyResolvers = new Map<string, () => void>();

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
      setupLogger.info('Registered route {method} {path} -> {service}.{handler}', {
        method: route.method,
        path: route.path,
        service: serviceName,
        handler: route.handler.name
      });
    }
  });

  ipcMain.on(FETCH_REQUEST_CHANNEL, async (event: IpcMainEvent, ipcRequest: IpcRequest) => {
    const startTime = Date.now();

    const reqLogger = requestLogger.with({
      requestId: ipcRequest.id,
      method: ipcRequest.method,
      url: ipcRequest.url
    });

    reqLogger.info('Request received');

    try {
      const route = findRoute(ipcRequest.method, ipcRequest.url);

      if (!route) {
        reqLogger.warn('Route not found');
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

      const requestHeaders = new Headers(ipcRequest.headers);

      const request = new Request(fullUrl, {
        method: ipcRequest.method,
        headers: requestHeaders,
        body: ipcRequest.body,
        signal: abortController.signal
      });

      const response: Response = await route.handler(request);

      if (response.body instanceof ReadableStream) {
        reqLogger.info('Streaming response');
        await handleStreamResponse(event, ipcRequest.id, response, reqLogger);
      } else {
        const duration = Date.now() - startTime;
        reqLogger.info('Request completed in {duration}ms', {
          duration,
          status: response.status
        });
        await handleRegularResponse(event, ipcRequest.id, response);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      reqLogger.error('Request failed after {duration}ms: {error}', {
        duration,
        error
      });
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
    const controller = activeStreams.get(abortRequest.id);
    if (controller) {
      const abortLogger = requestLogger.with({ requestId: abortRequest.id });
      abortLogger.info('Aborting stream request');
      controller.abort();
    }
  });

  ipcMain.on(FETCH_STREAM_READY_CHANNEL, (_event: IpcMainEvent, readyMsg: IpcStreamReady) => {
    const resolver = streamReadyResolvers.get(readyMsg.id);
    if (resolver) {
      const readyLogger = requestLogger.with({ requestId: readyMsg.id });
      readyLogger.debug('Stream ready signal received from renderer');
      resolver();
      streamReadyResolvers.delete(readyMsg.id);
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
  const headers = headersToObject(response.headers);

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

async function handleStreamResponse(event: IpcMainEvent, requestId: string, response: Response, reqLogger: ReturnType<typeof requestLogger.with>) {
  const headers = headersToObject(response.headers);

  const abortController = activeStreams.get(requestId);
  if (!abortController) {
    reqLogger.error('No AbortController found');
    return;
  }

  sendResponse(event, {
    id: requestId,
    status: response.status,
    statusText: response.statusText,
    headers,
    isStream: true
  });

  reqLogger.debug('Waiting for stream ready signal from renderer');
  await new Promise<void>((resolve) => {
    streamReadyResolvers.set(requestId, resolve);
  });
  reqLogger.debug('Stream ready signal received, starting to send chunks');

  let chunkCount = 0;
  let bytesTransferred = 0;
  const streamStartTime = Date.now();

  try {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      if (abortController.signal.aborted) {
        const duration = Date.now() - streamStartTime;
        reqLogger.warn('Stream aborted after {duration}ms, {chunks} chunks, {bytes} bytes', {
          duration,
          chunks: chunkCount,
          bytes: bytesTransferred
        });
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
        const duration = Date.now() - streamStartTime;
        reqLogger.info('Stream completed in {duration}ms, {chunks} chunks, {bytes} bytes', {
          duration,
          chunks: chunkCount,
          bytes: bytesTransferred
        });
        activeStreams.delete(requestId);
        if (!event.sender.isDestroyed()) {
          const end: IpcStreamEnd = { id: requestId };
          event.sender.send(FETCH_STREAM_END_CHANNEL, end);
        }
        break;
      }

      if (!event.sender.isDestroyed()) {
        const text = decoder.decode(value, { stream: true });
        chunkCount++;
        bytesTransferred += value.length;
        const chunk: IpcStreamChunk = { id: requestId, data: text };
        event.sender.send(FETCH_STREAM_DATA_CHANNEL, chunk);
      }
    }
  } catch (error) {
    const duration = Date.now() - streamStartTime;
    reqLogger.error('Stream error after {duration}ms, {chunks} chunks: {error}', {
      duration,
      chunks: chunkCount,
      error
    });
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
