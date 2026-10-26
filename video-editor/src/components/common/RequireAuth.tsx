import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Spinner } from '@/components/ui/Spinner';

/** Redirects to /login in cloud mode when signed out. Local mode needs no account. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { mode, ready, user } = useAuthStore();
  const location = useLocation();
  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (mode === 'cloud' && !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
