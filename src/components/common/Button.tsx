import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'gold' | 'wine' | 'danger' | 'dangerGhost';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-ink-900 text-cream shadow-sm hover:bg-ink-800 active:bg-ink-950 disabled:hover:bg-ink-900',
  secondary:
    'bg-white text-ink-800 border border-ink-200 shadow-sm hover:border-ink-300 hover:bg-ink-50',
  ghost: 'text-ink-600 hover:bg-ink-100/80 hover:text-ink-900',
  gold: 'bg-gold-400 text-ink-950 shadow-sm hover:bg-gold-300 active:bg-gold-500',
  wine: 'bg-wine-700 text-white shadow-sm hover:bg-wine-600',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-500',
  dangerGhost: 'text-rose-600 hover:bg-rose-50',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
  icon: 'h-10 w-10',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, leadingIcon, trailingIcon, block, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium tracking-[-0.01em] transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-cream',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
});

export function IconButton({
  label,
  className,
  variant = 'ghost',
  size = 'icon',
  ...props
}: ButtonProps & { label: string }) {
  return (
    <Button
      aria-label={label}
      title={label}
      variant={variant}
      size={size}
      className={cn('rounded-xl', className)}
      {...props}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-ink-400', className)} />;
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-ink-500">
      <Loader2 className="h-5 w-5 animate-spin text-gold-500" />
      {label}
    </div>
  );
}
