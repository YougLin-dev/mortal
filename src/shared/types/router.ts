/* eslint-disable @typescript-eslint/no-explicit-any */

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export interface RouteMetadata {
  method: HTTPMethod;
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  handler: Function;
}

// IPC data transfer interfaces
export interface IpcRequest {
  id: string;
  method: HTTPMethod;
  url: string;
  headers: Record<string, string>;
  body?: any;
}

export interface IpcResponse {
  id: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: any;
  isStream?: boolean;
}

export interface IpcStreamChunk {
  id: string;
  data: any;
}

export interface IpcStreamEnd {
  id: string;
}

export interface IpcStreamError {
  id: string;
  error: {
    message: string;
    stack?: string;
  };
}

export interface StreamController {
  onData: (callback: (data: any) => void) => void;
  onEnd: (callback: () => void) => void;
  onError: (callback: (error: { message: string; stack?: string }) => void) => void;
  cleanup: () => void;
}
