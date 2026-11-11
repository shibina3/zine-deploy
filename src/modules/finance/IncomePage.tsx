import { useMemo, useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import type { IncomeEntry, IncomeSource } from '@/types';
import { useBills, useIncomes, usePayments } from '@/hooks/useDb';
import { currentMonth, formatDate, monthRange } from '@/utils/date';
import { formatINR, sumPaise } from '@/utils/money';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { DataTable, type Column } from '@/components/common/DataTable';
import { EmptyState, PageHeader } from '@/components/common/PageHeader';
import { IncomeDialog } from './IncomeDialog';

const SOURCE_LABEL: Record<IncomeSource, string> = {
  SERVICE: 'Service income',
  PRODUCT: 'Product sales',
  BRIDAL: 'Bridal booking',
  OTHER: 'Other income',
};

const columns: Column<IncomeEntry>[] = [
  {
    key: 'date',
    header: 'Date',
    cell: (income) => (
      <span className="text-[12.5px] text-ink-700">{formatDate(income.date, 'd MMM yyyy')}</span>
    ),
  },
  {
    key: 'description',
    header: 'Income',
    cell: (income) => (
      <div>
        <p className="text-[13px] font-medium text-ink-900">{income.description}</p>
        <p className="text-[11px] text-ink-500">{SOURCE_LABEL[income.source]}</p>
      </div>
    ),
  },
  {
    key: 'method',
    header: 'Method',
    cell: (income) => <Badge tone="neutral">{income.method}</Badge>,
    headerClassName: 'hidden md:table-cell',
    className: 'hidden md:table-cell',
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    cell: (income) => (
      <span className="text-[13px] font-semibold tabular-nums text-sage-700">
        {formatINR(income.amount)}
      </span>
    ),
  },
];

export function IncomePage() {
  const incomes = useIncomes();
  const bills = useBills();
  const payments = usePayments();
  const [month, setMonth] = useState(currentMonth());
  const [creating, setCreating] = useState(false);
  const range = monthRange(month);

  const summary = useMemo(() => {
    const sales = sumPaise(
      bills
        .filter(
          (bill) =>
            bill.status !== 'CANCELLED' && bill.billDate >= range.from && bill.billDate <= range.to,
        )
        .map((bill) => bill.total),
    );
    const collected = sumPaise(
      payments
        .filter((payment) => payment.paidAt >= range.from && payment.paidAt <= range.to)
        .map((payment) => payment.amount),
    );
    const other = sumPaise(
      incomes
        .filter((income) => income.date.startsWith(month))
        .map((income) => income.amount),
    );
    return { sales, collected, other };
  }, [bills, payments, incomes, month, range.from, range.to]);

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Income"
        description="Service and product income comes from bills automatically. Add other income separately."
        actions={
          <>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-[12.5px] text-ink-700"
            />
            <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              Add income
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">Sales billed</p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-ink-900">
            {formatINR(summary.sales)}
          </p>
          <p className="text-[11px] text-ink-400">Bills in {formatDate(`${month}-01`, 'MMMM yyyy')}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Cash collected
          </p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-sage-700">
            {formatINR(summary.collected)}
          </p>
          <p className="text-[11px] text-ink-400">Payments received, including advances</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Other income
          </p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-ink-900">
            {formatINR(summary.other)}
          </p>
          <p className="text-[11px] text-ink-400">Vouchers, rentals, misc.</p>
        </Card>
      </div>

      <DataTable
        columns={columns}
        rows={incomes}
        rowKey={(income) => income.id}
        empty={
          <EmptyState
            icon={<Wallet className="h-5 w-5" />}
            title="No other income recorded"
            description="Bills already count as service income. Use this page for vouchers or non-service income."
            action={
              <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                Add income
              </Button>
            }
          />
        }
      />

      <IncomeDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
