import type { Customer } from '@/types';
import type { Column } from '@/components/common/DataTable';
import { Avatar } from '@/components/common/Badge';
import { formatDate } from '@/utils/date';
import { formatINR } from '@/utils/money';

export interface CustomerRow extends Customer {
  visits: number;
  outstanding: number;
}

export const customerColumns: Column<CustomerRow>[] = [
  {
    key: 'name',
    header: 'Customer',
    cell: (row) => (
      <div className="flex items-center gap-2.5">
        <Avatar name={row.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink-900">{row.name}</p>
          <p className="text-[11.5px] text-ink-500">{row.phone}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'email',
    header: 'Email',
    cell: (row) => <span className="text-[12.5px] text-ink-500">{row.email || '—'}</span>,
    headerClassName: 'hidden md:table-cell',
    className: 'hidden md:table-cell',
  },
  {
    key: 'visits',
    header: 'Visits',
    align: 'right',
    cell: (row) => <span className="tabular-nums text-[12.5px] text-ink-700">{row.visits}</span>,
  },
  {
    key: 'spend',
    header: 'Lifetime spend',
    align: 'right',
    cell: (row) => (
      <span className="tabular-nums text-[13px] font-medium text-ink-900">{formatINR(row.totalSpend)}</span>
    ),
  },
  {
    key: 'balance',
    header: 'Outstanding',
    align: 'right',
    cell: (row) =>
      row.outstanding > 0 ? (
        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-rose-600">
          {formatINR(row.outstanding)}
        </span>
      ) : (
        <span className="text-[12px] text-ink-300">—</span>
      ),
  },
  {
    key: 'last',
    header: 'Last visit',
    align: 'right',
    cell: (row) => (
      <span className="text-[12px] text-ink-500">
        {row.lastVisitAt ? formatDate(row.lastVisitAt, 'd MMM') : '—'}
      </span>
    ),
    headerClassName: 'hidden lg:table-cell',
    className: 'hidden lg:table-cell',
  },
];
