import {
  ACTIVITY_FILTERS,
  CUSTOMER_SORT_KEYS,
  type ActivityFilter,
  type CustomerListParams,
  type CustomerSortKey,
  type SortOrder,
} from '../api/types';

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;
export const DEFAULT_SORT: CustomerSortKey = 'historical_spend';
export const DEFAULT_ORDER: SortOrder = 'desc';

export type ExplorerState = {
  search: string;
  segment: string;
  country: string;
  activity: ActivityFilter | '';
  sort: CustomerSortKey;
  order: SortOrder;
  page: number;
  page_size: number;
};

export const DEFAULT_EXPLORER_STATE: ExplorerState = {
  search: '',
  segment: '',
  country: '',
  activity: '',
  sort: DEFAULT_SORT,
  order: DEFAULT_ORDER,
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
};

export const ACTIVITY_OPTIONS: { value: ActivityFilter | ''; label: string }[] = [
  { value: '', label: 'All customers' },
  { value: 'active_90', label: 'Active in last 90 days' },
  { value: 'active_365', label: 'Active in last 365 days' },
  { value: 'inactive_365', label: 'Inactive 365+ days' },
];

function isActivity(value: string): value is ActivityFilter {
  return (ACTIVITY_FILTERS as readonly string[]).includes(value);
}

function isSortKey(value: string): value is CustomerSortKey {
  return (CUSTOMER_SORT_KEYS as readonly string[]).includes(value);
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}

/** Reads explorer state from the URL query string, falling back to defaults for invalid values. */
export function parseExplorerParams(searchParams: URLSearchParams): ExplorerState {
  const activityRaw = searchParams.get('activity') ?? '';
  const sortRaw = searchParams.get('sort') ?? '';
  const orderRaw = searchParams.get('order');
  const pageSize = parsePositiveInt(searchParams.get('page_size'), DEFAULT_PAGE_SIZE);
  return {
    search: (searchParams.get('search') ?? '').trim(),
    segment: searchParams.get('segment') ?? '',
    country: searchParams.get('country') ?? '',
    activity: isActivity(activityRaw) ? activityRaw : '',
    sort: isSortKey(sortRaw) ? sortRaw : DEFAULT_SORT,
    order: orderRaw === 'asc' || orderRaw === 'desc' ? orderRaw : DEFAULT_ORDER,
    page: parsePositiveInt(searchParams.get('page'), 1),
    page_size: (PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
  };
}

/** Writes explorer state to the URL, omitting defaults so shared links stay short. */
export function toSearchParams(state: ExplorerState): URLSearchParams {
  const searchParams = new URLSearchParams();
  if (state.search) searchParams.set('search', state.search);
  if (state.segment) searchParams.set('segment', state.segment);
  if (state.country) searchParams.set('country', state.country);
  if (state.activity) searchParams.set('activity', state.activity);
  if (state.sort !== DEFAULT_SORT) searchParams.set('sort', state.sort);
  if (state.order !== DEFAULT_ORDER) searchParams.set('order', state.order);
  if (state.page !== 1) searchParams.set('page', String(state.page));
  if (state.page_size !== DEFAULT_PAGE_SIZE) searchParams.set('page_size', String(state.page_size));
  return searchParams;
}

/** The exact query parameters sent to GET /customers (and, minus pagination, to the CSV export). */
export function toListParams(state: ExplorerState): CustomerListParams {
  // Key order matches the documented parameter order: filters, then sort, then pagination.
  const params: CustomerListParams = {};
  if (state.search) params.search = state.search;
  if (state.segment) params.segment = state.segment;
  if (state.country) params.country = state.country;
  if (state.activity) params.activity = state.activity;
  params.sort = state.sort;
  params.order = state.order;
  params.page = state.page;
  params.page_size = state.page_size;
  return params;
}

export function hasActiveFilters(state: ExplorerState): boolean {
  return Boolean(state.search || state.segment || state.country || state.activity);
}
