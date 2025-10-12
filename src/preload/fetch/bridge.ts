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
  IpcStreamReady,
  StreamController,
  IpcAbortRequest
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
import { getPreloadFetchLogger } from '@/shared/logging/helpers';
import { parseFetchInput, headersToObject } from '@/shared/utils/fetch-utils';

const baseLogger = getPreloadFetchLogger();

let requestId = 0;

function generateRequestId(): string {
  return `req-${Date.now()}-${++requestId}`;
}

export function ipcFetch(input: RequestInfo | URL, init?: RequestInit): Promise<IpcResponse> {
  const { url, init: mergedInit } = parseFetchInput(input, init);
  const id = generateRequestId();
  const method = mergedInit?.method || 'GET';

  const logger = baseLogger.with({
    requestId: id,
    method,
    url
  });

  logger.info('Sending IPC request');

  return new Promise((resolve) => {
    const request: IpcRequest = {
      id,
      method: method.toUpperCase() as HTTPMethod,
      url,
      headers: headersToObject(mergedInit?.headers),
      body: mergedInit?.body as string
    };

    const responseHandler = (_event: IpcRendererEvent, response: IpcResponseData) => {
      if (response.id !== id) {
        logger.warn('ID mismatch, ignoring. got={got}, expected={expected}', {
          got: response.id,
          expected: id
        });
        return;
      }

      cleanup();

      if (response.isStream) {
        logger.debug('Received stream response');
        resolve({
          id: response.id,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          isStream: true
        });
      } else {
        logger.debug('Received regular response');
        resolve({
          id: response.id,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: response.body
        });
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

export function abortIpcRequest(id: string): void {
  const logger = baseLogger.with({ requestId: id });
  logger.info('Aborting request');
  const request: IpcAbortRequest = { id };
  ipcRenderer.send(FETCH_ABORT_CHANNEL, request);
}

export function notifyStreamReady(id: string): void {
  const logger = baseLogger.with({ requestId: id });
  logger.debug('Stream ready notification sent');
  const ready: IpcStreamReady = { id };
  ipcRenderer.send(FETCH_STREAM_READY_CHANNEL, ready);
}
