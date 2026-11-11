import { Minus, Plus, Trash2 } from 'lucide-react';
import type { DraftItem } from '@/db/repositories/billingRepo';
import { lineGross, sanitiseLineDiscount } from '@/modules/billing/logic';
import { formatINR } from '@/utils/money';
import { IconButton } from '@/components/common/Button';
import { Input, MoneyInput } from '@/components/common/Field';

export function BillLineRow({
  line,
  onChange,
  onRemove,
}: {
  line: DraftItem;
  onChange: (line: DraftItem) => void;
  onRemove: () => void;
}) {
  const gross = lineGross(line);
  const discount = sanitiseLineDiscount(line);
  const total = gross - discount;

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-[160px] flex-1">
        <p className="truncate text-[13px] font-medium text-ink-900">{line.name}</p>
        <p className="text-[11px] text-ink-500">
          {line.category || (line.itemType === 'PRODUCT' ? 'Product' : 'Service')} · {formatINR(line.unitPrice)} each
        </p>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-ink-200 bg-white p-0.5">
        <IconButton
          label="Reduce quantity"
          size="sm"
          className="h-7 w-7"
          onClick={() => onChange({ ...line, quantity: Math.max(1, line.quantity - 1) })}
          disabled={line.quantity <= 1}
        >
          <Minus className="h-3 w-3" />
        </IconButton>
        <Input
          value={String(line.quantity)}
          onChange={(event) => {
            const quantity = Math.max(1, Number(event.target.value.replace(/\D/g, '')) || 1);
            onChange({ ...line, quantity });
          }}
          className="h-7 w-10 border-0 bg-transparent px-0 text-center text-[12.5px] font-semibold shadow-none focus:ring-0"
          inputMode="numeric"
        />
        <IconButton
          label="Increase quantity"
          size="sm"
          className="h-7 w-7"
          onClick={() => onChange({ ...line, quantity: line.quantity + 1 })}
        >
          <Plus className="h-3 w-3" />
        </IconButton>
      </div>

      <div className="w-[92px]">
        <MoneyInput
          value={line.discount}
          onChange={(nextDiscount) =>
            onChange({ ...line, discount: Math.min(nextDiscount, gross) })
          }
          placeholder="Discount"
        />
      </div>

      <div className="w-[76px] text-right">
        <p className="text-[13px] font-semibold tabular-nums text-ink-900">{formatINR(total)}</p>
        {discount > 0 && <p className="text-[10.5px] text-sage-600">−{formatINR(discount)}</p>}
      </div>

      <IconButton label="Remove item" variant="dangerGhost" size="sm" onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </IconButton>
    </li>
  );
}
