import type { IpcResponse } from '@/shared/types/router';

// Wrap raw ipcFetch to create standard Response objects in renderer
export async function ipcFetch(url: string, init?: RequestInit): Promise<Response> {
  const rawResponse: IpcResponse = await window._ipcFetchRaw(url, init);

  if (rawResponse.isStream && rawResponse.id) {
    // Create ReadableStream for streaming response
    const controller = window._createStreamController(rawResponse.id);

    const stream = new ReadableStream({
      start(streamController) {
        const encoder = new TextEncoder();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        controller.onData((data: any) => {
          const jsonStr = JSON.stringify(data);
          streamController.enqueue(encoder.encode(jsonStr + '\n'));
        });

        controller.onEnd(() => {
          controller.cleanup();
          streamController.close();
        });

        controller.onError((error) => {
          controller.cleanup();
          streamController.error(new Error(error.message));
        });
      }
    });

    // Return standard Response with stream
    return new Response(stream, {
      status: rawResponse.status,
      statusText: rawResponse.statusText,
      headers: new Headers(rawResponse.headers)
    });
  } else {
    // Regular response - return standard Response
    const body = typeof rawResponse.body === 'string' ? rawResponse.body : JSON.stringify(rawResponse.body);

    return new Response(body, {
      status: rawResponse.status,
      statusText: rawResponse.statusText,
      headers: new Headers(rawResponse.headers)
    });
  }
}
