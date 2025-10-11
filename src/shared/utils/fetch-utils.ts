/**
 * Parses fetch input (RequestInfo | URL) and returns the URL string and merged RequestInit.
 *
 * @param input - The fetch input (string, URL, or Request object)
 * @param init - Optional RequestInit to merge with Request properties
 * @returns An object containing the parsed URL string and merged init
 */
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
