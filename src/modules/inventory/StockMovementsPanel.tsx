import { ArrowDownToLine } from 'lucide-react';
import type { StockMovementType } from '@/types';
import { useStockMovements } from '@/hooks/useDb';
import { STOCK_MOVEMENT_LABEL } from '@/utils/constants';
import { formatDate } from '@/utils/date';
import { formatINR, formatNumber } from '@/utils/money';
import { Badge } from '@/components/common/Badge';
import { SectionCard } from '@/components/common/Card';
import { EmptyState } from '@/components/common/PageHeader';

export function StockMovementsPanel({
  filter,
  title,
  subtitle,
  icon,
}: {
  filter: StockMovementType | StockMovementType[];
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  const movements = useStockMovements(600);
  const types = Array.isArray(filter) ? filter : [filter];
  const rows = movements.filter((movement) => types.includes(movement.type)).slice(0, 30);

  return (
    <SectionCard
      title={title}
      subtitle={subtitle}
      icon={icon ?? <ArrowDownToLine className="h-4 w-4" />}
      bodyClassName="px-0 pb-0 pt-1"
    >
      {rows.length === 0 ? (
        <EmptyState compact title="Nothing recorded yet" description="Movements appear here as they happen." />
      ) : (
        <ul className="divide-y divide-ink-100">
          {rows.map((movement) => (
            <li key={movement.id} className="flex items-center gap-3 px-5 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-ink-800">{movement.productName}</p>
                <p className="text-[11px] text-ink-500">
                  {formatDate(movement.occurredAt, 'd MMM yyyy')} · {STOCK_MOVEMENT_LABEL[movement.type]}
                  {movement.note ? ` · ${movement.note}` : ''}
                </p>
              </div>
              <Badge tone={movement.quantity >= 0 ? 'success' : 'wine'}>
                {movement.quantity >= 0 ? '+' : ''}
                {formatNumber(movement.quantity)}
              </Badge>
              <span className="w-20 text-right text-[12px] tabular-nums text-ink-600">
                {formatINR((movement.unitCost ?? 0) * Math.abs(movement.quantity))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
