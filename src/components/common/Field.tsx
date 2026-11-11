import {
  forwardRef,
  useEffect,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { parseRupees, rupeesForInput } from '@/utils/money';
import type { Paise } from '@/types';

const CONTROL =
  'w-full rounded-xl border border-ink-200 bg-white text-sm text-ink-900 shadow-[inset_0_1px_2px_rgba(28,23,20,0.03)] transition-colors placeholder:text-ink-400 hover:border-ink-300 focus:border-gold-400 focus:outline-none focus:ring-4 focus:ring-gold-400/15 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400';

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="label flex items-center gap-1 text-ink-500">
          {label}
          {required && <span className="text-wine-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[12px] font-medium text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-[12px] leading-snug text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  controlClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, controlClassName, invalid, leading, trailing, ...props },
  ref,
) {
  if (!leading && !trailing) {
    return (
      <input
        ref={ref}
        className={cn(
          CONTROL,
          'h-10 px-3.5',
          invalid && 'border-rose-300 focus:border-rose-400 focus:ring-rose-400/15',
          className,
        )}
        {...props}
      />
    );
  }
  return (
    <div className={cn('relative', className)}>
      {leading && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
          {leading}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          CONTROL,
          'h-10',
          leading ? 'pl-9' : 'pl-3.5',
          trailing ? 'pr-9' : 'pr-3.5',
          invalid && 'border-rose-300 focus:border-rose-400 focus:ring-rose-400/15',
          controlClassName,
        )}
        {...props}
      />
      {trailing && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400">{trailing}</span>}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(CONTROL, 'min-h-[84px] px-3.5 py-2.5 leading-relaxed', className)}
        {...props}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className={cn('relative', className)}>
        <select ref={ref} className={cn(CONTROL, 'h-10 appearance-none pl-3.5 pr-9')} {...props}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      </div>
    );
  },
);

/** Rupee input backed by integer paise. */
export function MoneyInput({
  value,
  onChange,
  className,
  placeholder = '0',
  autoFocus,
  disabled,
  id,
}: {
  value: Paise;
  onChange: (paise: Paise) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  id?: string;
}) {
  const [text, setText] = useState(() => rupeesForInput(value));

  useEffect(() => {
    if (parseRupees(text) !== value) setText(rupeesForInput(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn('relative', className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-display text-[15px] text-ink-400">
        ₹
      </span>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        value={text}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.target.value.replace(/[^\d.]/g, '');
          setText(next);
          onChange(parseRupees(next));
        }}
        onBlur={() => setText(rupeesForInput(parseRupees(text)))}
        className={cn(CONTROL, 'h-10 pl-8 pr-3 text-right font-medium tabular-nums')}
      />
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(CONTROL, 'h-10 pl-9 pr-9')}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cn('flex items-start gap-3', disabled && 'opacity-60')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-sage-500' : 'bg-ink-200',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
      {(label || description) && (
        <span>
          {label && <span className="block text-sm font-medium text-ink-800">{label}</span>}
          {description && (
            <span className="mt-0.5 block text-[12px] leading-snug text-ink-500">{description}</span>
          )}
        </span>
      )}
    </label>
  );
}
