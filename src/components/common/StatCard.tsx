import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/utils/cn';

export function StatCard({
  label,
  value,
  icon,
  hint,
  trend,
  accent = 'ink',
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  trend?: number | null;
  accent?: 'ink' | 'gold' | 'wine' | 'sage';
  className?: string;
}) {
  const accents = {
    ink: 'bg-ink-900 text-gold-300',
    gold: 'bg-gold-400 text-ink-950',
    wine: 'bg-wine-700 text-wine-50',
    sage: 'bg-sage-600 text-sage-50',
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-ink-200/70 bg-porcelain p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">{label}</p>
          <p className="mt-2 font-display text-[26px] font-medium leading-none tracking-tight text-ink-900 numeric">
            {value}
          </p>
        </div>
        {icon && (
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', accents[accent])}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[12px]">
        {typeof trend === 'number' && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold',
              trend >= 0 ? 'bg-sage-50 text-sage-700' : 'bg-rose-50 text-rose-600',
            )}
          >
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
        {hint && <span className="truncate text-ink-400">{hint}</span>}
      </div>
    </div>
  );
}

export function MetricRow({
  label,
  value,
  muted,
  strong,
}: {
  label: ReactNode;
  value: ReactNode;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className={cn('text-[13px]', muted ? 'text-ink-400' : 'text-ink-500')}>{label}</span>
      <span
        className={cn(
          'text-[13px] tabular-nums',
          strong ? 'font-semibold text-ink-900' : 'font-medium text-ink-800',
        )}
      >
        {value}
      </span>
    </div>
  );
}
