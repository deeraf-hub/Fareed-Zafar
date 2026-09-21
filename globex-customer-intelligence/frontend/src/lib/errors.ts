import { isApiError } from '../api/client';

export type ErrorDescription = { title: string; message: string; code?: string; status?: number };

export function describeError(error: unknown, fallbackTitle = 'Something went wrong'): ErrorDescription {
  if (isApiError(error)) {
    if (error.status === 404) {
      return { title: 'Not found', message: error.message, code: error.code, status: error.status };
    }
    if (error.status === 0) {
      return { title: 'API unreachable', message: error.message, code: error.code, status: error.status };
    }
    return { title: fallbackTitle, message: error.message, code: error.code, status: error.status };
  }
  if (error instanceof Error && error.message) {
    return { title: fallbackTitle, message: error.message };
  }
  return { title: fallbackTitle, message: 'An unexpected error occurred while loading this data.' };
}
