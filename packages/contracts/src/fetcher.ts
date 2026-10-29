/**
 * Shared fetch for the generated Orval client. Builds a `Request` (so tests can
 * read `request.method` / `request.url` / `request.json()`), sends it same-origin
 * with the session cookie, and returns Orval's `{ status, data, headers }` wrapper.
 */
export const apiFetch = async <T>(
  url: string,
  options?: RequestInit,
): Promise<T> => {
  // Resolve relative `/api/...` against the current origin so `Request` can parse
  // it in jsdom/undici, which reject origin-less URLs. In the browser this is
  // the same-origin the Vite proxy forwards to the API.
  const base =
    typeof globalThis.location !== 'undefined' ? globalThis.location.origin : undefined;
  const absolute = base ? new URL(url, base).toString() : url;

  const request = new Request(absolute, {
    ...options,
    credentials: 'include',
  });

  const response = await globalThis.fetch(request);

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  return {
    status: response.status,
    data,
    headers: response.headers,
  } as T;
};

/** Thrown on a non-2xx response. `status` lets callers detect 401, etc. */
export class ApiError extends Error {
  constructor(
    public status: number,
    statusText: string,
  ) {
    super(`API error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}
