import { TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  trend?: number | null;
  to?: string;
}

const TONES = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-700',
} as const;

export function StatCard({ label, value, hint, icon: Icon, tone = 'default', trend, to }: StatCardProps) {
  const content = (
    <div className="flex h-full items-start justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1.5 truncate text-2xl font-semibold tabular tracking-tight">{value}</p>
        {hint ? <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p> : null}
        {typeof trend === 'number' ? (
          <p
            className={cn(
              'mt-1.5 flex items-center gap-1 text-xs font-medium',
              trend >= 0 ? 'text-emerald-600' : 'text-red-600',
            )}
          >
            {trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {Math.abs(trend).toFixed(1)}%
          </p>
        ) : null}
      </div>
      <div className={cn('shrink-0 rounded-lg p-2.5', TONES[tone])}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );

  return to ? (
    <Link
      to={to}
      className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  ) : (
    content
  );
}
