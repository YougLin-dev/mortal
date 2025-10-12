export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type SerializedBody = string | JsonValue | null | undefined;

export interface RouteMetadata {
  method: HTTPMethod;
  path: string;

  handler: Function;
}

export interface IpcRequest {
  id: string;
  method: HTTPMethod;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface IpcResponse {
  id: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: SerializedBody;
  isStream?: boolean;
}

export interface IpcStreamChunk {
  id: string;
  data: string;
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

export interface IpcStreamReady {
  id: string;
}

export interface IpcAbortRequest {
  id: string;
}

export interface StreamController {
  onData: (callback: (data: string) => void) => void;
  onEnd: (callback: () => void) => void;
  onError: (callback: (error: { message: string; stack?: string }) => void) => void;
  cleanup: () => void;
}
