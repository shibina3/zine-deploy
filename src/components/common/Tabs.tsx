import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  items: Array<{ value: T; label: ReactNode; count?: number }>;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn('inline-flex items-center gap-1 rounded-xl border border-ink-200/70 bg-ink-100/50 p-1', className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150',
              active
                ? 'bg-white text-ink-900 shadow-sm ring-1 ring-ink-200/60'
                : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  active ? 'bg-ink-900 text-gold-200' : 'bg-ink-200/70 text-ink-600',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: ReactNode }>;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={cn('inline-flex rounded-lg border border-ink-200 bg-white p-0.5', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md font-medium transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-[12px]' : 'px-3 py-1.5 text-[13px]',
            option.value === value ? 'bg-ink-900 text-cream' : 'text-ink-500 hover:text-ink-800',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
