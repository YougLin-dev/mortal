import { ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type {
  HTTPMethod,
  IpcRequest,
  IpcResponse,
  IpcResponse as IpcResponseData,
  IpcStreamChunk,
  IpcStreamEnd,
  IpcStreamError,
  StreamController,
  IpcAbortRequest,
  SerializedBody
} from '@/shared/types/router';
import {
  FETCH_REQUEST_CHANNEL,
  FETCH_RESPONSE_CHANNEL,
  FETCH_STREAM_DATA_CHANNEL,
  FETCH_STREAM_END_CHANNEL,
  FETCH_STREAM_ERROR_CHANNEL,
  FETCH_ABORT_CHANNEL
} from '@/shared/types/fetch';
import { getPreloadFetchLogger } from '@/shared/logging/helpers';
import { parseFetchInput } from '@/shared/utils/fetch-utils';

const baseLogger = getPreloadFetchLogger();

let requestId = 0;

function generateRequestId(): string {
  return `req-${Date.now()}-${++requestId}`;
}

export function ipcFetch(input: RequestInfo | URL, init?: RequestInit): Promise<IpcResponse> {
  const { url, init: mergedInit } = parseFetchInput(input, init);

  baseLogger.info('ipcFetch called {method} {url}', { method: mergedInit?.method || 'GET', url });
  return new Promise((resolve) => {
    const id = generateRequestId();
    const logger = getPreloadFetchLogger({ id });
    logger.debug('Generated request ID {id}');
    logger.debug('ipcFetch init {method} {url}', { method: mergedInit?.method || 'GET', url });

    const request: IpcRequest = {
      id,
      method: (mergedInit?.method?.toUpperCase() || 'GET') as HTTPMethod,
      url,
      headers: headersToObject(mergedInit?.headers),
      body: mergedInit?.body as SerializedBody | undefined
    };

    const responseHandler = (_event: IpcRendererEvent, response: IpcResponseData) => {
      if (response.id !== id) {
        logger.warn('ID mismatch, ignoring got={got}, expected{expected}', { got: response.id, expected: id });
        return;
      }

      logger.debug('ID matched; cleaning up and resolving');
      cleanup();

      if (response.isStream) {
        logger.debug('Resolving with STREAM response');
        resolve({
          id: response.id,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          isStream: true
        });
        logger.debug('STREAM response resolved');
      } else {
        logger.debug('Resolving with NON-STREAM response');
        resolve({
          id: response.id,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: response.body
        });
        logger.debug('NON-STREAM response resolved');
      }
    };

    const cleanup = () => {
      ipcRenderer.removeListener(FETCH_RESPONSE_CHANNEL, responseHandler);
    };

    ipcRenderer.on(FETCH_RESPONSE_CHANNEL, responseHandler);

    ipcRenderer.send(FETCH_REQUEST_CHANNEL, request);
  });
}

export function createStreamController(streamId: string): StreamController {
  const listeners = {
    data: [] as ((data: string) => void)[],
    end: [] as (() => void)[],
    error: [] as ((error: { message: string; stack?: string }) => void)[]
  };

  const dataHandler = (_event: IpcRendererEvent, chunk: IpcStreamChunk) => {
    if (chunk.id !== streamId) return;
    listeners.data.forEach((cb) => cb(chunk.data));
  };

  const endHandler = (_event: IpcRendererEvent, end: IpcStreamEnd) => {
    if (end.id !== streamId) return;
    listeners.end.forEach((cb) => cb());
  };

  const errorHandler = (_event: IpcRendererEvent, error: IpcStreamError) => {
    if (error.id !== streamId) return;
    listeners.error.forEach((cb) => cb(error.error));
  };

  ipcRenderer.on(FETCH_STREAM_DATA_CHANNEL, dataHandler);
  ipcRenderer.on(FETCH_STREAM_END_CHANNEL, endHandler);
  ipcRenderer.on(FETCH_STREAM_ERROR_CHANNEL, errorHandler);

  return {
    onData: (callback) => listeners.data.push(callback),
    onEnd: (callback) => listeners.end.push(callback),
    onError: (callback) => listeners.error.push(callback),
    cleanup: () => {
      ipcRenderer.removeListener(FETCH_STREAM_DATA_CHANNEL, dataHandler);
      ipcRenderer.removeListener(FETCH_STREAM_END_CHANNEL, endHandler);
      ipcRenderer.removeListener(FETCH_STREAM_ERROR_CHANNEL, errorHandler);
      listeners.data = [];
      listeners.end = [];
      listeners.error = [];
    }
  };
}

function headersToObject(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};

  if (headers instanceof Headers) {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  if (Array.isArray(headers)) {
    const obj: Record<string, string> = {};
    headers.forEach(([key, value]) => {
      obj[key] = value;
    });
    return obj;
  }

  return headers as Record<string, string>;
}

export function abortIpcRequest(id: string): void {
  const logger = getPreloadFetchLogger({ id });
  logger.warn('Aborting request {id}', { id });
  const request: IpcAbortRequest = { id };
  ipcRenderer.send(FETCH_ABORT_CHANNEL, request);
}
