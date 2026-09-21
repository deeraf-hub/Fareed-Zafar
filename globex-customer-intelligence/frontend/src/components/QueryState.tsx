import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';

type Props<T> = {
  query: UseQueryResult<T, unknown>;
  loadingText?: string;
  errorTitle?: string;
  children: (data: T) => ReactNode;
};

/** Renders loading / error / success states for a react-query result. */
export function QueryState<T>({ query, loadingText, errorTitle, children }: Props<T>) {
  if (query.isPending) {
    return <LoadingState text={loadingText} />;
  }
  if (query.isError) {
    return <ErrorState error={query.error} title={errorTitle} onRetry={() => void query.refetch()} />;
  }
  return <>{children(query.data)}</>;
}
