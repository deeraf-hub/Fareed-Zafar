import type {
  CustomerDetail,
  CustomerFiltersResponse,
  CustomerListItem,
  CustomerListParams,
  DataQualityResponse,
  DatasetInfo,
  HealthResponse,
  ModelsResponse,
  OverviewParams,
  OverviewResponse,
  Paginated,
  PredictionsParams,
  PredictionsResponse,
  ReadyResponse,
  SegmentsResponse,
} from './types';

const rawBase = import.meta.env.VITE_API_BASE_URL ?? '';

/** API origin without a trailing slash. Empty means same-origin relative requests. */
export const API_BASE_URL = rawBase.replace(/\/+$/, '');
export const API_PREFIX = '/api/v1';

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Serialises params, skipping undefined, null and empty-string values. */
export function buildQuery(params?: QueryParams): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    searchParams.set(key, String(value));
  }
  const encoded = searchParams.toString();
  return encoded ? `?${encoded}` : '';
}

/** Absolute (or origin-relative) URL for an API path such as "/customers". */
export function apiUrl(path: string, params?: QueryParams): string {
  return `${API_BASE_URL}${API_PREFIX}${path}${buildQuery(params)}`;
}

function isApiErrorBody(body: unknown): body is { error: { code: string; message: string; details?: unknown } } {
  if (typeof body !== 'object' || body === null) return false;
  const error = (body as { error?: unknown }).error;
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return typeof code === 'string' && typeof message === 'string';
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (isApiErrorBody(body)) {
    return new ApiError(response.status, body.error.code, body.error.message, body.error.details);
  }
  const statusText = response.statusText ? ` (${response.statusText})` : '';
  return new ApiError(response.status, `http_${response.status}`, `Request failed with status ${response.status}${statusText}.`);
}

async function request<T>(path: string, params?: QueryParams, init?: RequestInit): Promise<T> {
  const url = apiUrl(path, params);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, 'network_error', 'Could not reach the API. Check that the backend is running and reachable.');
  }
  if (!response.ok) {
    throw await toApiError(response);
  }
  return (await response.json()) as T;
}

function exportParams(params: CustomerListParams): QueryParams {
  // Same filters and sort as the list; pagination intentionally omitted.
  return {
    search: params.search,
    segment: params.segment,
    country: params.country,
    activity: params.activity,
    sort: params.sort,
    order: params.order,
  };
}

export const api = {
  health: () => request<HealthResponse>('/health'),
  ready: () => request<ReadyResponse>('/ready'),
  dataset: () => request<DatasetInfo>('/dataset'),
  overview: (params: OverviewParams = {}) => request<OverviewResponse>('/overview', params),
  customers: (params: CustomerListParams = {}) => request<Paginated<CustomerListItem>>('/customers', params),
  customersExportUrl: (params: CustomerListParams = {}) => apiUrl('/customers/export.csv', exportParams(params)),
  customerFilters: () => request<CustomerFiltersResponse>('/customers/filters'),
  customer: (customerId: string) => request<CustomerDetail>(`/customers/${encodeURIComponent(customerId)}`),
  segments: () => request<SegmentsResponse>('/segments'),
  predictions: (params: PredictionsParams) => request<PredictionsResponse>('/predictions', params),
  models: () => request<ModelsResponse>('/models'),
  dataQuality: () => request<DataQualityResponse>('/data-quality'),
};

export type Api = typeof api;
