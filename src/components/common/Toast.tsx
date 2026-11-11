import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastStore, type ToastItem } from './toastStore';

const TONE_META = {
  success: { icon: CheckCircle2, ring: 'text-sage-600', bar: 'bg-sage-500' },
  error: { icon: AlertCircle, ring: 'text-rose-600', bar: 'bg-rose-500' },
  info: { icon: Info, ring: 'text-sky-600', bar: 'bg-sky-500' },
  warning: { icon: AlertCircle, ring: 'text-gold-600', bar: 'bg-gold-400' },
};

function ToastCard({ toast }: { toast: ToastItem }) {
  const dismiss = useToastStore((state) => state.dismiss);
  const meta = TONE_META[toast.tone];
  const Icon = meta.icon;

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <div className="pointer-events-auto relative w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-ink-200/80 bg-porcelain p-4 shadow-lift animate-slide-in-right">
      <span className={cn('absolute inset-y-0 left-0 w-1', meta.bar)} />
      <div className="flex items-start gap-3 pl-1">
        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', meta.ring)} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900">{toast.title}</p>
          {toast.description && (
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{toast.description}</p>
          )}
        </div>
        <button
          onClick={() => dismiss(toast.id)}
          className="rounded-lg p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[120] flex flex-col items-end gap-2.5">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
