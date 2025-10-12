import type { JsonValue, SerializedBody } from '../types/router';

export function parseFetchInput(input: RequestInfo | URL, init?: RequestInit): { url: string; init: RequestInit | undefined } {
  let url: string;
  let mergedInit = init;

  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input instanceof Request) {
    url = input.url;
    // Merge Request properties with init, with init taking precedence
    mergedInit = {
      method: init?.method ?? input.method,
      headers: init?.headers ?? input.headers,
      body: init?.body ?? input.body,
      mode: init?.mode ?? input.mode,
      credentials: init?.credentials ?? input.credentials,
      cache: init?.cache ?? input.cache,
      redirect: init?.redirect ?? input.redirect,
      referrer: init?.referrer ?? input.referrer,
      integrity: init?.integrity ?? input.integrity,
      signal: init?.signal ?? input.signal,
      ...init
    };
  } else {
    throw new TypeError('Fetch input must be a string, URL, or Request object');
  }

  return { url, init: mergedInit };
}

export function headersToObject(headers?: HeadersInit): Record<string, string> {
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

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (valueType === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto === null || proto === Object.prototype) {
      return Object.values(value as Record<string, unknown>).every(isJsonValue);
    }
  }

  return false;
}

export function ensureSerializableBody(body: RequestInit['body']): SerializedBody {
  if (body == null) {
    return undefined;
  }

  if (typeof body === 'string') {
    return body;
  }

  if (typeof body === 'object') {
    if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
      throw new TypeError('ipcFetch does not support binary request bodies.');
    }

    if (body instanceof URLSearchParams) {
      return body.toString();
    }

    if (body instanceof FormData) {
      throw new TypeError('ipcFetch does not support multipart FormData bodies.');
    }

    if (isJsonValue(body)) {
      return body;
    }

    throw new TypeError('ipcFetch request body must be JSON-serializable.');
  }

  throw new TypeError('ipcFetch only supports string or JSON-compatible request bodies.');
}

export function ensureHeaders(init: RequestInit | undefined, serializedBody: SerializedBody): HeadersInit | undefined {
  if (serializedBody === undefined || typeof serializedBody === 'string') {
    return init?.headers;
  }

  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

export function prepareBody(serializedBody: SerializedBody): string | undefined {
  if (serializedBody === undefined) {
    return undefined;
  }

  if (typeof serializedBody === 'string') {
    return serializedBody;
  }

  return JSON.stringify(serializedBody);
}
