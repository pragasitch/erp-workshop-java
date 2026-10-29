/** Shared fetch for the generated client. Same-origin `/api`, sends the session cookie. */
export const apiFetch = async <T>(
  url: string,
  options?: RequestInit,
): Promise<T> => {
  const response = await globalThis.fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    statusText: string,
  ) {
    super(`API error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}
