import type { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: 'default' | 'warning' | 'success';
}

export const DashboardCard = ({ label, value, icon: Icon, hint, tone = 'default' }: DashboardCardProps) => {
  const toneClass =
    tone === 'warning'
      ? 'bg-amber-100 text-amber-700'
      : tone === 'success'
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-ink-100 text-ink-600';

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-ink-900">{value}</p>
        </div>
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      {hint && <p className="mt-3 text-xs text-ink-500">{hint}</p>}
    </div>
  );
};
