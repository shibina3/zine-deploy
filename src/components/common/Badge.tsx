import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { TONES, type StatusMeta, type Tone } from '@/utils/constants';
import { avatarTone, initials } from '@/utils/misc';

export function Badge({
  tone = 'neutral',
  children,
  className,
  dot,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

export function StatusPill({ meta, className }: { meta: StatusMeta; className?: string }) {
  return (
    <Badge tone={meta.tone} className={className} dot>
      {meta.label}
    </Badge>
  );
}

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-[11px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-12 w-12 text-sm',
  };
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold uppercase tracking-wide ring-1 ring-inset',
        sizes[size],
        avatarTone(name),
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function CountPill({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex min-w-[22px] items-center justify-center rounded-full bg-ink-100 px-1.5 py-0.5 text-[11px] font-semibold text-ink-600',
        className,
      )}
    >
      {count}
    </span>
  );
}

/** Small definition row used inside detail drawers. */
export function DetailRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-6 py-2', className)}>
      <span className="text-[13px] text-ink-500">{label}</span>
      <span className="text-right text-[13px] font-medium text-ink-800">{children}</span>
    </div>
  );
}
