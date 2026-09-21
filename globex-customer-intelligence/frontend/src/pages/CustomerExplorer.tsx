import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { CustomerListItem, CustomerSortKey, SortOrder } from '../api/types';
import { Button, buttonClasses } from '../components/Button';
import { Card } from '../components/Card';
import { DataTable, type Column } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { PredictionCell } from '../components/PredictionCell';
import { Select } from '../components/Select';
import { useCustomerFilters, useCustomers, useDataset } from '../hooks/queries';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import {
  ACTIVITY_OPTIONS,
  PAGE_SIZE_OPTIONS,
  hasActiveFilters,
  parseExplorerParams,
  toListParams,
  toSearchParams,
  type ExplorerState,
} from '../lib/customerParams';
import { EM_DASH, formatDate, formatGBP, formatNumber } from '../lib/format';
import { PREDICTION_DEFINITIONS, PREDICTION_LABELS } from '../lib/labels';

function defaultOrderFor(key: CustomerSortKey): SortOrder {
  return key === 'customer_id' ? 'asc' : 'desc';
}

const COLUMNS: Column<CustomerListItem, CustomerSortKey>[] = [
  {
    id: 'customer_id',
    header: 'Customer ID',
    sortKey: 'customer_id',
    nowrap: true,
    render: (row) => (
      <Link to={`/customers/${encodeURIComponent(row.customer_id)}`} className="link">
        {row.customer_id}
      </Link>
    ),
  },
  {
    id: 'segment',
    header: 'Segment',
    render: (row) => row.segment_name ?? <span className="text-ink-secondary">{EM_DASH}</span>,
  },
  {
    id: 'country',
    header: 'Country',
    nowrap: true,
    render: (row) => row.country ?? <span className="text-ink-secondary">{EM_DASH}</span>,
  },
  {
    id: 'last_purchase_at',
    header: 'Last purchase',
    sortKey: 'last_purchase_at',
    nowrap: true,
    render: (row) => formatDate(row.last_purchase_at),
  },
  {
    id: 'historical_spend',
    header: 'Historical spending (GBP)',
    headerTitle: 'Net spending across all eligible orders up to the data cutoff.',
    sortKey: 'historical_spend',
    align: 'right',
    nowrap: true,
    render: (row) => formatGBP(row.historical_spend),
  },
  {
    id: 'order_count',
    header: 'Order count',
    headerTitle: 'Number of non-cancellation orders up to the data cutoff.',
    sortKey: 'order_count',
    align: 'right',
    render: (row) => formatNumber(row.order_count),
  },
  {
    id: 'repeat_purchase_probability',
    header: PREDICTION_LABELS.repeat_purchase_probability,
    headerTitle: PREDICTION_DEFINITIONS.repeat_purchase_probability,
    sortKey: 'repeat_purchase_probability',
    align: 'right',
    render: (row) => <PredictionCell prediction={row.repeat_purchase_probability} kind="probability" />,
  },
  {
    id: 'predicted_spend_30d',
    header: PREDICTION_LABELS.predicted_spend_30d,
    headerTitle: PREDICTION_DEFINITIONS.predicted_spend_30d,
    sortKey: 'predicted_spend_30d',
    align: 'right',
    render: (row) => <PredictionCell prediction={row.predicted_spend_30d} kind="gbp" />,
  },
];

export function CustomerExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => parseExplorerParams(searchParams), [searchParams]);
  const listParams = useMemo(() => toListParams(state), [state]);

  const customers = useCustomers(listParams);
  const filters = useCustomerFilters();
  const dataset = useDataset();

  const [searchText, setSearchText] = useState(state.search);
  const debouncedSearch = useDebouncedValue(searchText.trim(), 300);
  const debouncedRef = useRef(debouncedSearch);
  debouncedRef.current = debouncedSearch;

  function update(patch: Partial<ExplorerState>, options: { replace?: boolean } = {}) {
    setSearchParams(toSearchParams({ ...state, ...patch }), { replace: options.replace ?? false });
  }

  // Push the debounced search box value into the URL (and so into the query).
  useEffect(() => {
    if (debouncedSearch !== state.search) {
      update({ search: debouncedSearch, page: 1 }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Keep the search box in sync when the URL changes from outside (back/forward, shared link).
  useEffect(() => {
    if (state.search !== debouncedRef.current) {
      setSearchText(state.search);
    }
  }, [state.search]);

  function onSort(key: CustomerSortKey) {
    const order: SortOrder = state.sort === key ? (state.order === 'asc' ? 'desc' : 'asc') : defaultOrderFor(key);
    update({ sort: key, order, page: 1 });
  }

  function clearFilters() {
    setSearchText('');
    update({ search: '', segment: '', country: '', activity: '', page: 1 });
  }

  const exportUrl = api.customersExportUrl(listParams);
  const filtersActive = hasActiveFilters(state);
  const isUpdating = customers.isFetching && customers.isPlaceholderData;

  const segmentOptions = (filters.data?.segments ?? []).map((segment) => ({ value: segment, label: segment }));
  const countryOptions = (filters.data?.countries ?? []).map((entry) => ({
    value: entry.country,
    label: `${entry.country} (${formatNumber(entry.customers)})`,
  }));

  return (
    <>
      <PageHeader
        title="Customer Explorer"
        description="Search, filter and sort identified customers. Predictions are scored as of the data cutoff."
        actions={
          <a href={exportUrl} download="customers.csv" className={buttonClasses('secondary')} data-testid="export-csv">
            Export CSV
          </a>
        }
      />

      <Card className="mb-6" bodyClassName="py-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <label htmlFor="customer-search" className="label">
              Search by customer ID
            </label>
            <input
              id="customer-search"
              type="search"
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 17850"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="input"
            />
          </div>
          <Select
            id="filter-segment"
            label="Segment"
            value={state.segment}
            placeholder="All segments"
            options={segmentOptions}
            disabled={filters.isPending}
            onChange={(value) => update({ segment: value, page: 1 })}
          />
          <Select
            id="filter-country"
            label="Country"
            value={state.country}
            placeholder="All countries"
            options={countryOptions}
            disabled={filters.isPending}
            onChange={(value) => update({ country: value, page: 1 })}
          />
          <Select
            id="filter-activity"
            label="Activity"
            value={state.activity}
            options={ACTIVITY_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            onChange={(value) => update({ activity: value as ExplorerState['activity'], page: 1 })}
          />
        </div>
        {filters.isError && (
          <p className="mt-3 text-sm text-caution" role="alert">
            Filter options could not be loaded; search and sorting still work.
          </p>
        )}
        {filtersActive && (
          <div className="mt-3">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      <p className="sr-only" role="status" aria-live="polite">
        {customers.isPending
          ? 'Loading customers.'
          : isUpdating
            ? 'Updating customer list.'
            : customers.data
              ? `${formatNumber(customers.data.total)} customers found.`
              : ''}
      </p>

      {customers.isPending ? (
        <LoadingState text="Loading customers…" rows={8} />
      ) : customers.isError ? (
        <ErrorState error={customers.error} title="Could not load customers" onRetry={() => void customers.refetch()} />
      ) : customers.data.total === 0 ? (
        <EmptyState
          title="No customers match these filters."
          description="Try a different customer ID, segment, country or activity window."
          action={
            filtersActive ? (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={COLUMNS}
            rows={customers.data.items}
            rowKey={(row) => row.customer_id}
            sort={{ key: state.sort, order: state.order }}
            onSort={onSort}
            busy={isUpdating}
            caption="Customers matching the current filters"
            emptyMessage="No customers on this page. Use the pagination controls to go back."
          />
          <Pagination
            page={customers.data.page}
            totalPages={customers.data.total_pages}
            total={customers.data.total}
            pageSize={state.page_size}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={(page) => update({ page })}
            onPageSizeChange={(pageSize) => update({ page_size: pageSize, page: 1 })}
            itemLabel="customers"
            idPrefix="customers"
          />
          <p className="text-xs text-ink-secondary">
            Predictions are scored as of the data cutoff
            {dataset.data?.data_cutoff ? ` (${formatDate(dataset.data.data_cutoff)})` : ''}. Open a customer to see the model
            version behind each value.
          </p>
        </div>
      )}
    </>
  );
}
