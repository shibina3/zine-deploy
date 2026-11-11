import { Package, Plus } from 'lucide-react';
import type { Product } from '@/types';
import { cn } from '@/utils/cn';
import { formatINR } from '@/utils/money';

export function ProductPickerList({
  products,
  onAdd,
  disabled,
}: {
  products: Product[];
  onAdd: (product: Product) => void;
  disabled?: boolean;
}) {
  if (products.length === 0) {
    return <p className="px-3 py-10 text-center text-[12.5px] text-ink-400">No products available. Add stock in Inventory.</p>;
  }

  return (
    <ul className="space-y-1">
      {products.map((product) => (
        <li key={product.id}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAdd(product)}
            className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-gold-50/60 disabled:opacity-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-600">
              <Package className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink-900">{product.name}</span>
              <span
                className={cn(
                  'block text-[11px]',
                  product.stockCached <= product.minStock ? 'text-rose-500' : 'text-ink-500',
                )}
              >
                Stock {product.stockCached} {product.unit} · {product.category}
              </span>
            </span>
            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-800">
              {formatINR(product.sellingPrice)}
            </span>
            <Plus className="h-4 w-4 shrink-0 text-ink-300 group-hover:text-gold-600" />
          </button>
        </li>
      ))}
    </ul>
  );
}
