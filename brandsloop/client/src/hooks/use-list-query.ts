import * as React from 'react';
import { useSearchParams } from 'react-router-dom';

export interface ListState {
  page: number;
  pageSize: number;
  search: string;
  sortBy?: string;
  sortDir: 'asc' | 'desc';
  filters: Record<string, string>;
}

/**
 * Keeps table state (page, search, sort, filters) in the URL so a filtered
 * view can be bookmarked, shared and restored on the back button.
 */
export function useListQuery(defaults: Partial<ListState> = {}) {
  const [params, setParams] = useSearchParams();

  const state: ListState = {
    page: Number(params.get('page') ?? defaults.page ?? 1),
    pageSize: Number(params.get('pageSize') ?? defaults.pageSize ?? 25),
    search: params.get('search') ?? '',
    sortBy: params.get('sortBy') ?? defaults.sortBy,
    sortDir: (params.get('sortDir') as 'asc' | 'desc') ?? defaults.sortDir ?? 'desc',
    filters: Object.fromEntries(
      [...params.entries()].filter(
        ([key]) => !['page', 'pageSize', 'search', 'sortBy', 'sortDir'].includes(key),
      ),
    ),
  };

  const update = React.useCallback(
    (patch: Record<string, string | number | undefined>, resetPage = true) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === '' || value === 'all') next.delete(key);
            else next.set(key, String(value));
          }
          if (resetPage && !('page' in patch)) next.set('page', '1');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setSort = React.useCallback(
    (column: string) => {
      const nextDir = state.sortBy === column && state.sortDir === 'desc' ? 'asc' : 'desc';
      update({ sortBy: column, sortDir: nextDir }, false);
    },
    [state.sortBy, state.sortDir, update],
  );

  const reset = React.useCallback(() => setParams({}, { replace: true }), [setParams]);

  const activeFilterCount = Object.values(state.filters).filter(Boolean).length;

  return { state, update, setSort, reset, activeFilterCount };
}

/** Delays a fast-changing value so typing does not fire a request per keystroke. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
