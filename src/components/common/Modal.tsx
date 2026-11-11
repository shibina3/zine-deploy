import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button, IconButton } from './Button';
import { Textarea } from './Field';

function useDialog(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZES;
}) {
  useDialog(open, onClose);
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="scrim absolute inset-0 animate-fade-in" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-ink-200/70 bg-porcelain shadow-lift animate-scale-in sm:rounded-3xl',
          SIZES[size],
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-5">
            <div>
              {title && <h2 className="font-display text-xl font-medium text-ink-900">{title}</h2>}
              {description && <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{description}</p>}
            </div>
            <IconButton label="Close" onClick={onClose} className="-mr-1 -mt-1">
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 bg-ink-50/40 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}) {
  useDialog(open, onClose);
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div className="scrim absolute inset-0 animate-fade-in" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 flex h-full w-full flex-col border-l border-ink-200/70 bg-porcelain shadow-lift animate-slide-in-right',
          size === 'lg' ? 'max-w-2xl' : 'max-w-lg',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-5">
          <div>
            {title && <h2 className="font-display text-xl font-medium text-ink-900">{title}</h2>}
            {subtitle && <p className="mt-1 text-[13px] text-ink-500">{subtitle}</p>}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mr-1 -mt-1">
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 bg-ink-50/40 px-6 py-4">
            {footer}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  requireReason = false,
  reasonLabel = 'Reason',
  busy = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  requireReason?: boolean;
  reasonLabel?: string;
  busy?: boolean;
  children?: ReactNode;
}) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={busy}>
        {cancelLabel}
      </Button>
      <Button
        variant={tone === 'danger' ? 'danger' : 'primary'}
        loading={busy}
        disabled={requireReason && reason.trim().length < 3}
        onClick={() => void onConfirm(reason.trim())}
      >
        {confirmLabel}
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={
        <span className="flex items-center gap-2">
          {tone === 'danger' && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
          )}
          {title}
        </span>
      }
      description={description}
      footer={footer}
    >
      <div className="space-y-4">
        {children}
        {requireReason && (
          <div>
            <label htmlFor="confirm-reason" className="label mb-1.5 block">
              {reasonLabel} <span className="text-wine-500">*</span>
            </label>
            <Textarea
              id="confirm-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why this action is needed. This is saved in the audit trail."
              autoFocus
            />
            <p className="mt-1 text-[12px] text-ink-400">
              At least 3 characters. Stored permanently in audit history.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
