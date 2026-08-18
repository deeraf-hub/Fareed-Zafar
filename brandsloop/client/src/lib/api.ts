export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, query?: Query) {
  const url = new URL(`/api${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.pathname + url.search;
}

async function handle<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const error = body?.error ?? {};
    throw new ApiError(
      error.message ?? 'Something went wrong. Please try again.',
      response.status,
      error.code,
      error.details,
    );
  }
  return body as T;
}

export const api = {
  get<T>(path: string, query?: Query) {
    return fetch(buildUrl(path, query), { credentials: 'include' }).then(handle<T>);
  },
  post<T>(path: string, body?: unknown) {
    return fetch(buildUrl(path), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }).then(handle<T>);
  },
  put<T>(path: string, body?: unknown) {
    return fetch(buildUrl(path), {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }).then(handle<T>);
  },
  delete<T>(path: string) {
    return fetch(buildUrl(path), { method: 'DELETE', credentials: 'include' }).then(handle<T>);
  },
  /** Downloads an export, honouring whatever filters are currently applied. */
  async download(path: string, query: Query, fallbackName: string) {
    const response = await fetch(buildUrl(path, { ...query, format: 'csv' }), {
      credentials: 'include',
    });
    if (!response.ok) {
      await handle(response);
    }
    const disposition = response.headers.get('content-disposition') ?? '';
    const match = /filename="?([^";]+)"?/.exec(disposition);
    return { blob: await response.blob(), filename: match?.[1] ?? fallbackName };
  },
};

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  unread?: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: PageMeta;
}
