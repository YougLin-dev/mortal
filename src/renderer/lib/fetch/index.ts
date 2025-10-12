import type { IpcResponse } from '@/shared/types/router';
import type { Logger } from '@logtape/logtape';

import { getRendererFetchLogger } from '@/shared/logging/helpers';
import { ensureHeaders, ensureSerializableBody, parseFetchInput, prepareBody } from '@/shared/utils/fetch-utils';

export async function ipcFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const { url, init: mergedInit } = parseFetchInput(input, init);
  const method = mergedInit?.method || 'GET';

  const logger = getRendererFetchLogger().with({
    method,
    url
  });

  logger.info('Fetch request started');

  try {
    const serializedBody = ensureSerializableBody(mergedInit?.body);
    const headers = ensureHeaders(mergedInit, serializedBody);
    const bodyPayload = prepareBody(serializedBody);

    const rawResponse: IpcResponse = await window._ipcFetchRaw(url, {
      ...mergedInit,
      headers,
      body: bodyPayload
    });

    logger.debug('Response received {status} {isStream}', {
      status: rawResponse.status,
      isStream: rawResponse.isStream ? 'stream' : 'regular'
    });

    const abortSignal = mergedInit?.signal ?? undefined;

    return processResponse(rawResponse, abortSignal, logger);
  } catch (error) {
    logger.error('Fetch failed: {error}', { error });
    throw error;
  }
}

function processResponse(rawResponse: IpcResponse, abortSignal?: AbortSignal, parentLogger?: Logger): Response {
  const logger = rawResponse.id
    ? (parentLogger || getRendererFetchLogger()).with({ requestId: rawResponse.id })
    : parentLogger || getRendererFetchLogger();

  if (rawResponse.isStream && rawResponse.id) {
    logger.info('Setting up stream response');
    const controller = window._createStreamController(rawResponse.id);

    window._notifyStreamReady(rawResponse.id);

    if (abortSignal) {
      const abortHandler = () => {
        logger.info('Stream aborted by signal');
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

    let isClosed = false;

    const stream = new ReadableStream({
      start(streamController) {
        const encoder = new TextEncoder();

        controller.onData((data) => {
          if (isClosed) {
            return;
          }
          streamController.enqueue(encoder.encode(data));
        });

        controller.onEnd(() => {
          if (isClosed) {
            return;
          }
          logger.info('Stream completed');
          isClosed = true;
          controller.cleanup();
          streamController.close();
        });

        controller.onError((error) => {
          if (isClosed) {
            return;
          }
          logger.error('Stream error: {error}', { error });
          isClosed = true;
          controller.cleanup();
          streamController.error(new Error(error.message));
        });
      },
      cancel(reason) {
        logger.debug('Stream cancelled: {reason}', { reason });
        isClosed = true;
        controller.cleanup();
      }
    });

    return new Response(stream, {
      status: rawResponse.status,
      statusText: rawResponse.statusText,
      headers: new Headers(rawResponse.headers)
    });
  } else {
    const body = typeof rawResponse.body === 'string' ? rawResponse.body : JSON.stringify(rawResponse.body);

    return new Response(body, {
      status: rawResponse.status,
      statusText: rawResponse.statusText,
      headers: new Headers(rawResponse.headers)
    });
  }
}
