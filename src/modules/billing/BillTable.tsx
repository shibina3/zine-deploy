import type { Bill } from '@/types';
import type { Column } from '@/components/common/DataTable';
import { BILL_STATUS } from '@/utils/constants';
import { formatDate } from '@/utils/date';
import { formatINR } from '@/utils/money';
import { StatusPill } from '@/components/common/Badge';

export function billColumns(phones: Map<string, string>): Column<Bill>[] {
  return [
    {
      key: 'number',
      header: 'Bill',
      cell: (bill) => (
        <div>
          <p className="text-[12.5px] font-semibold text-ink-900">{bill.billNumber}</p>
          <p className="text-[11px] text-ink-500">{formatDate(bill.billDate, 'd MMM yyyy, h:mm a')}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (bill) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink-800">{bill.customerName}</p>
          <p className="text-[11px] text-ink-500">{phones.get(bill.customerId) ?? bill.customerPhone}</p>
        </div>
      ),
    },
    {
      key: 'employee',
      header: 'Handled by',
      cell: (bill) => <span className="text-[12.5px] text-ink-600">{bill.employeeName}</span>,
      headerClassName: 'hidden md:table-cell',
      className: 'hidden md:table-cell',
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      cell: (bill) => (
        <span className="text-[13px] font-semibold tabular-nums text-ink-900">{formatINR(bill.total)}</span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      cell: (bill) =>
        bill.balance > 0 ? (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-rose-600">
            {formatINR(bill.balance)}
          </span>
        ) : (
          <span className="text-[12px] text-ink-300">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      cell: (bill) => <StatusPill meta={BILL_STATUS[bill.status]} />,
    },
  ];
}
