import { Trash2 } from 'lucide-react';
import type { Expense } from '@/types';
import type { Column } from '@/components/common/DataTable';
import { formatDate } from '@/utils/date';
import { formatINR } from '@/utils/money';
import { Badge } from '@/components/common/Badge';
import { IconButton } from '@/components/common/Button';

export function expenseColumns(onDelete: (expense: Expense) => void): Column<Expense>[] {
  return [
    {
      key: 'date',
      header: 'Date',
      cell: (expense) => (
        <span className="text-[12.5px] text-ink-700">{formatDate(expense.date, 'd MMM yyyy')}</span>
      ),
    },
    {
      key: 'description',
      header: 'Expense',
      cell: (expense) => (
        <div>
          <p className="text-[13px] font-medium text-ink-900">{expense.description}</p>
          <p className="text-[11px] text-ink-500">
            {expense.category}
            {expense.invoiceRef ? ` · ${expense.invoiceRef}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      cell: (expense) => <Badge tone="neutral">{expense.method}</Badge>,
      headerClassName: 'hidden md:table-cell',
      className: 'hidden md:table-cell',
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (expense) => (
        <span className="text-[13px] font-semibold tabular-nums text-ink-900">
          {formatINR(expense.amount)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (expense) => (
        <IconButton label="Delete expense" variant="dangerGhost" onClick={() => onDelete(expense)}>
          <Trash2 className="h-3.5 w-3.5" />
        </IconButton>
      ),
    },
  ];
}
