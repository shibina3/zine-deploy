import { Clock, FlaskConical, Pencil } from 'lucide-react';
import type { Service } from '@/types';
import { setServiceActive } from '@/db/repositories/serviceRepo';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { cn } from '@/utils/cn';
import { formatDuration } from '@/utils/date';
import { formatINR } from '@/utils/money';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';

export function ServiceCard({
  service,
  onEdit,
  onRecipe,
  readOnly = false,
}: {
  service: Service;
  onEdit: () => void;
  onRecipe: () => void;
  readOnly?: boolean;
}) {
  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-2xl border border-ink-200/70 bg-porcelain p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift',
        !service.isActive && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-[16px] font-medium text-ink-900">{service.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{service.category}</Badge>
            <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-400">
              <Clock className="h-3 w-3" /> {formatDuration(service.durationMinutes)}
            </span>
          </div>
        </div>
        <p className="shrink-0 font-display text-[18px] font-medium text-ink-900 tabular-nums">
          {formatINR(service.price)}
        </p>
      </div>

      {service.description && (
        <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-ink-500">{service.description}</p>
      )}

      <div className="mt-3 flex items-center gap-1.5 border-t border-ink-100 pt-3">
        {readOnly ? (
          <span
            className={cn(
              'ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]',
              service.isActive ? 'bg-sage-50 text-sage-700' : 'bg-ink-100 text-ink-500',
            )}
          >
            {service.isActive ? 'Active' : 'Inactive'}
          </span>
        ) : (
          <>
            <Button size="sm" variant="ghost" leadingIcon={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" leadingIcon={<FlaskConical className="h-3.5 w-3.5" />} onClick={onRecipe}>
              Recipe
            </Button>
            <button
              onClick={async () => {
                try {
                  await setServiceActive(service.id, !service.isActive);
                  notifySuccess(service.isActive ? 'Service deactivated' : 'Service activated', service.name);
                } catch (error) {
                  notifyError('Could not update service', error instanceof Error ? error.message : undefined);
                }
              }}
              className={cn(
                'ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors',
                service.isActive
                  ? 'bg-sage-50 text-sage-700 hover:bg-sage-100'
                  : 'bg-ink-100 text-ink-500 hover:bg-ink-200',
              )}
            >
              {service.isActive ? 'Active' : 'Inactive'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
