import type { Product } from '@/types';
import type { Column } from '@/components/common/DataTable';
import { formatINR, formatNumber } from '@/utils/money';

export const productColumns: Column<Product>[] = [
  {
    key: 'name',
    header: 'Product',
    cell: (product) => (
      <div>
        <p className="text-[13px] font-medium text-ink-900">{product.name}</p>
        <p className="text-[11px] text-ink-500">
          {product.sku} · {product.category}
        </p>
      </div>
    ),
  },
  {
    key: 'stock',
    header: 'Stock',
    align: 'right',
    cell: (product) => {
      const low = product.stockCached <= product.minStock;
      return (
        <div>
          <p
            className={
              low
                ? 'text-[13px] font-semibold tabular-nums text-rose-600'
                : 'text-[13px] font-semibold tabular-nums text-ink-900'
            }
          >
            {formatNumber(product.stockCached)} {product.unit}
          </p>
          <p className="text-[10.5px] text-ink-400">min {formatNumber(product.minStock)}</p>
        </div>
      );
    },
  },
  {
    key: 'purchase',
    header: 'Cost',
    align: 'right',
    cell: (product) => (
      <span className="text-[12.5px] tabular-nums text-ink-600">{formatINR(product.purchasePrice)}</span>
    ),
    headerClassName: 'hidden md:table-cell',
    className: 'hidden md:table-cell',
  },
  {
    key: 'selling',
    header: 'Selling',
    align: 'right',
    cell: (product) => (
      <span className="text-[13px] font-semibold tabular-nums text-ink-900">
        {formatINR(product.sellingPrice)}
      </span>
    ),
  },
  {
    key: 'margin',
    header: 'Margin',
    align: 'right',
    cell: (product) => {
      const margin = product.sellingPrice - product.purchasePrice;
      return (
        <span
          className={
            margin >= 0 ? 'text-[12px] tabular-nums text-sage-600' : 'text-[12px] tabular-nums text-rose-600'
          }
        >
          {formatINR(margin)}
        </span>
      );
    },
    headerClassName: 'hidden lg:table-cell',
    className: 'hidden lg:table-cell',
  },
  {
    key: 'status',
    header: 'Status',
    align: 'right',
    cell: (product) => (
      <span
        className={
          product.isActive
            ? 'rounded-full bg-sage-50 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-sage-700'
            : 'rounded-full bg-ink-100 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-500'
        }
      >
        {product.isActive ? 'Active' : 'Inactive'}
      </span>
    ),
  },
];
