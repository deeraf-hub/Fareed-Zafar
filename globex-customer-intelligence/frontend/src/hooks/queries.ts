import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { CustomerListParams, OverviewParams, PredictionsParams } from '../api/types';

const MINUTE = 60_000;

export const queryKeys = {
  dataset: ['dataset'] as const,
  overview: (params: OverviewParams) => ['overview', params.start ?? null, params.end ?? null] as const,
  customers: (params: CustomerListParams) => ['customers', params] as const,
  customerFilters: ['customers', 'filters'] as const,
  customer: (id: string) => ['customer', id] as const,
  segments: ['segments'] as const,
  predictions: (params: PredictionsParams) => ['predictions', params] as const,
  models: ['models'] as const,
  dataQuality: ['data-quality'] as const,
};

/** Dataset metadata rarely changes; cache it for the session. */
export function useDataset() {
  return useQuery({
    queryKey: queryKeys.dataset,
    queryFn: api.dataset,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useOverview(params: OverviewParams) {
  return useQuery({
    queryKey: queryKeys.overview(params),
    queryFn: () => api.overview(params),
    staleTime: 5 * MINUTE,
    placeholderData: keepPreviousData,
  });
}

export function useCustomers(params: CustomerListParams) {
  return useQuery({
    queryKey: queryKeys.customers(params),
    queryFn: () => api.customers(params),
    staleTime: MINUTE,
    placeholderData: keepPreviousData,
  });
}

export function useCustomerFilters() {
  return useQuery({
    queryKey: queryKeys.customerFilters,
    queryFn: api.customerFilters,
    staleTime: 10 * MINUTE,
  });
}

export function useCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customer(customerId ?? ''),
    queryFn: () => api.customer(customerId ?? ''),
    enabled: Boolean(customerId),
    staleTime: 5 * MINUTE,
    retry: (failureCount, error) => {
      // A missing customer will not appear on retry.
      if (typeof error === 'object' && error !== null && 'status' in error && error.status === 404) return false;
      return failureCount < 1;
    },
  });
}

export function useSegments() {
  return useQuery({
    queryKey: queryKeys.segments,
    queryFn: api.segments,
    staleTime: 10 * MINUTE,
  });
}

export function usePredictions(params: PredictionsParams) {
  return useQuery({
    queryKey: queryKeys.predictions(params),
    queryFn: () => api.predictions(params),
    staleTime: 5 * MINUTE,
    placeholderData: keepPreviousData,
  });
}

export function useModels() {
  return useQuery({
    queryKey: queryKeys.models,
    queryFn: api.models,
    staleTime: 10 * MINUTE,
  });
}

export function useDataQuality() {
  return useQuery({
    queryKey: queryKeys.dataQuality,
    queryFn: api.dataQuality,
    staleTime: 10 * MINUTE,
  });
}
