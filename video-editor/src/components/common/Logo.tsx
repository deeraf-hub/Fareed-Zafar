import { Link } from 'react-router-dom';
import { APP_NAME } from '@/config/env';

export function Logo({ to = '/', compact = false }: { to?: string; compact?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2 text-ink-100 hover:opacity-90" aria-label={`${APP_NAME} home`}>
      <img src="/favicon.svg" alt="" className="h-6 w-6" />
      {!compact && <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>}
    </Link>
  );
}
