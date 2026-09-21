import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}): RenderResult {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export type MockResponse = { status?: number; body: unknown };
export type FetchHandler = (url: URL) => MockResponse | undefined;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Replaces global fetch with a handler keyed on the request URL. No network access. */
export function mockFetch(handler: FetchHandler) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(raw, 'http://localhost');
    const result = handler(url);
    if (!result) {
      return jsonResponse({ error: { code: 'not_found', message: `No mock for ${url.pathname}` } }, 404);
    }
    return jsonResponse(result.body, result.status ?? 200);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** URLs (as strings) of every call made through the fetch mock. */
export function calledUrls(fetchMock: ReturnType<typeof mockFetch>): string[] {
  return fetchMock.mock.calls.map(([input]) =>
    typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url,
  );
}
