import type { IpcResponse, JsonValue, SerializedBody } from '@/shared/types/router';

import { getRendererFetchLogger } from '@/shared/logging/helpers';

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

function ensureSerializableBody(body: RequestInit['body']): SerializedBody {
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

function ensureHeaders(init: RequestInit | undefined, serializedBody: SerializedBody): HeadersInit | undefined {
  if (serializedBody === undefined || typeof serializedBody === 'string') {
    return init?.headers;
  }

  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

function prepareBody(serializedBody: SerializedBody): string | undefined {
  if (serializedBody === undefined) {
    return undefined;
  }

  if (typeof serializedBody === 'string') {
    return serializedBody;
  }

  return JSON.stringify(serializedBody);
}

export async function ipcFetch(url: string, init?: RequestInit): Promise<Response> {
  const logger = getRendererFetchLogger();
  logger.info('START {method} {url}', { method: init?.method || 'GET', url });
  logger.debug('Init {init}', { init });

  try {
    const serializedBody = ensureSerializableBody(init?.body);
    const headers = ensureHeaders(init, serializedBody);
    const bodyPayload = prepareBody(serializedBody);

    logger.debug('Calling window._ipcFetchRaw');
    const rawResponse: IpcResponse = await window._ipcFetchRaw(url, {
      ...init,
      headers,
      body: bodyPayload
    });

    logger.debug('GOT RAW RESPONSE {status} isStream={isStream}', {
      status: rawResponse.status,
      isStream: rawResponse.isStream,
      rawResponse
    });

    const abortSignal = init?.signal ?? undefined;

    return processResponse(rawResponse, abortSignal);
  } catch (error) {
    logger.error('Caught error: {error}', { error });
    throw error;
  }
}

function processResponse(rawResponse: IpcResponse, abortSignal?: AbortSignal): Response {
  const logger = getRendererFetchLogger({ id: rawResponse.id });
  if (rawResponse.isStream && rawResponse.id) {
    logger.debug('Setting up STREAM {id}', { id: rawResponse.id });
    const controller = window._createStreamController(rawResponse.id);

    if (abortSignal) {
      logger.debug('Setting up abort listener for stream');
      const abortHandler = () => {
        logger.warn('Abort signal triggered during stream');
        logger.warn('Sending abort request {id}', { id: rawResponse.id });
        window._abortIpcRequest(rawResponse.id!);
        controller.cleanup();
      };

      abortSignal.addEventListener('abort', abortHandler);

      const originalOnEnd = controller.onEnd;
      controller.onEnd = (callback) => {
        originalOnEnd.call(controller, () => {
          abortSignal.removeEventListener('abort', abortHandler);
          callback();
        });
      };
    }

    const stream = new ReadableStream({
      start(streamController) {
        logger.debug('ReadableStream.start called');
        const encoder = new TextEncoder();

        controller.onData((data) => {
          logger.debug('Stream data chunk received {data}', { data });
          streamController.enqueue(encoder.encode(data));
        });

        controller.onEnd(() => {
          logger.info('Stream ended');
          controller.cleanup();
          streamController.close();
        });

        controller.onError((error) => {
          logger.error('Stream error: {error}', { error });
          controller.cleanup();
          streamController.error(new Error(error.message));
        });
      }
    });

    logger.debug('Returning Response with ReadableStream');
    return new Response(stream, {
      status: rawResponse.status,
      statusText: rawResponse.statusText,
      headers: new Headers(rawResponse.headers)
    });
  } else {
    logger.debug('Non-stream response, returning regular Response');
    const body = typeof rawResponse.body === 'string' ? rawResponse.body : JSON.stringify(rawResponse.body);

    return new Response(body, {
      status: rawResponse.status,
      statusText: rawResponse.statusText,
      headers: new Headers(rawResponse.headers)
    });
  }
}
