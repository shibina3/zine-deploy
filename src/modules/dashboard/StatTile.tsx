import { Link } from 'react-router-dom';
import { IndianRupee, Sparkles, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { cn } from '@/utils/cn';

const TONES = {
  wine: 'bg-wine-50 text-wine-700',
  gold: 'bg-gold-50 text-gold-700',
  ink: 'bg-ink-100 text-ink-700',
  sage: 'bg-sage-50 text-sage-700',
};

export function StatTile({
  label,
  value,
  hint,
  tone,
  to,
  delta,
  deltaLabel,
}: {
  label: string;
  value: string;
  hint: string;
  tone: 'wine' | 'gold' | 'ink' | 'sage';
  to?: string;
  delta?: number | null;
  deltaLabel?: string;
}) {
  const icons = {
    wine: <IndianRupee className="h-4 w-4" />,
    gold: <TrendingUp className="h-4 w-4" />,
    ink: <Wallet className="h-4 w-4" />,
    sage: <Sparkles className="h-4 w-4" />,
  };

  const content = (
    <div className="group flex items-start justify-between gap-3 rounded-2xl border border-ink-200/70 bg-porcelain p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="min-w-0">
        <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">{label}</p>
        <p className="mt-2 font-display text-[24px] font-medium leading-none tracking-tight text-ink-900 tabular-nums">
          {value}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <p className="truncate text-[11.5px] text-ink-400">{hint}</p>
          {typeof delta === 'number' && (
            <span
              className={
                delta >= 0
                  ? 'inline-flex items-center gap-0.5 rounded-full bg-sage-50 px-1.5 py-0.5 text-[10px] font-semibold text-sage-700'
                  : 'inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600'
              }
            >
              {delta >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
              {delta >= 0 ? '+' : ''}
              {delta}%
              {deltaLabel && <span className="font-normal opacity-70">{deltaLabel}</span>}
            </span>
          )}
        </div>
      </div>
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
        {icons[tone]}
      </span>
    </div>
  );

  return to ? (
    <Link to={to} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
