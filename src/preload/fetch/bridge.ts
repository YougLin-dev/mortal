/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcRenderer } from 'electron';
import type {
  HTTPMethod,
  IpcRequest,
  IpcResponse,
  IpcResponse as IpcResponseData,
  IpcStreamChunk,
  IpcStreamEnd,
  IpcStreamError,
  StreamController
} from '@/shared/types/router';
import {
  FETCH_REQUEST_CHANNEL,
  FETCH_RESPONSE_CHANNEL,
  FETCH_STREAM_DATA_CHANNEL,
  FETCH_STREAM_END_CHANNEL,
  FETCH_STREAM_ERROR_CHANNEL
} from '@/shared/types/fetch';

let requestId = 0;

function generateRequestId(): string {
  return `req-${Date.now()}-${++requestId}`;
}

// Return raw response data that can be passed through contextBridge
export function ipcFetch(url: string, init?: RequestInit): Promise<IpcResponse> {
  return new Promise((resolve, reject) => {
    const id = generateRequestId();
    console.log(`ipcFetch: ${id} ${init?.method || 'GET'} ${url}`);

    const request: IpcRequest = {
      id,
      method: (init?.method?.toUpperCase() || 'GET') as HTTPMethod,
      url,
      headers: headersToObject(init?.headers),
      body: init?.body
    };

    let responseResolved = false;

    const responseHandler = (_event: any, response: IpcResponseData) => {
      if (response.id !== id) return;

      cleanup();
      responseResolved = true;

      if (response.isStream) {
        // For streams, just return metadata and let renderer handle ReadableStream
        resolve({
          id: response.id,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          isStream: true
        });
      } else {
        // Regular response - return body directly
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

    // Send request
    ipcRenderer.send(FETCH_REQUEST_CHANNEL, request);

    // Timeout handling
    if (init?.signal) {
      init.signal.addEventListener('abort', () => {
        if (!responseResolved) {
          cleanup();
          reject(new DOMException('Aborted', 'AbortError'));
        }
      });
    }
  });
}

// Create stream controller for given stream ID
export function createStreamController(streamId: string): StreamController {
  const listeners = {
    data: [] as ((data: any) => void)[],
    end: [] as (() => void)[],
    error: [] as ((error: { message: string; stack?: string }) => void)[]
  };

  const dataHandler = (_event: any, chunk: IpcStreamChunk) => {
    if (chunk.id !== streamId) return;
    listeners.data.forEach((cb) => cb(chunk.data));
  };

  const endHandler = (_event: any, end: IpcStreamEnd) => {
    if (end.id !== streamId) return;
    listeners.end.forEach((cb) => cb());
  };

  const errorHandler = (_event: any, error: IpcStreamError) => {
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
