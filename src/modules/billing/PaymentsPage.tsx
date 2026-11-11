import { useMemo, useState } from 'react';
import { Download, Wallet } from 'lucide-react';
import type { Payment } from '@/types';
import { useBills, usePayments } from '@/hooks/useDb';
import { downloadCsv } from '@/services/exports/csv';
import { PAYMENT_METHODS } from '@/utils/constants';
import { formatDateTime, todayISO, dayRange, monthRange, currentMonth } from '@/utils/date';
import { formatINR, sumPaise } from '@/utils/money';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { DataTable, type Column } from '@/components/common/DataTable';
import { EmptyState, PageHeader } from '@/components/common/PageHeader';
import { Tabs } from '@/components/common/Tabs';

type MethodFilter = 'ALL' | 'CASH' | 'UPI' | 'CARD' | 'OTHER';

export function PaymentsPage() {
  const payments = usePayments();
  const bills = useBills();
  const [filter, setFilter] = useState<MethodFilter>('ALL');

  const billMap = useMemo(() => new Map(bills.map((bill) => [bill.id, bill])), [bills]);

  const filtered = useMemo(
    () => payments.filter((payment) => filter === 'ALL' || payment.method === filter),
    [payments, filter],
  );

  const today = todayISO();
  const todayRange = dayRange(today);
  const month = monthRange(currentMonth());
  const todayTotal = sumPaise(
    payments
      .filter((payment) => payment.paidAt >= todayRange.from && payment.paidAt <= todayRange.to)
      .map((payment) => payment.amount),
  );
  const monthTotal = sumPaise(
    payments
      .filter((payment) => payment.paidAt >= month.from && payment.paidAt <= month.to)
      .map((payment) => payment.amount),
  );

  const columns: Column<Payment>[] = [
    {
      key: 'date',
      header: 'Received',
      cell: (payment) => (
        <div>
          <p className="text-[12.5px] font-medium text-ink-800">{formatDateTime(payment.paidAt)}</p>
          <p className="text-[11px] text-ink-500">{billMap.get(payment.billId)?.billNumber ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (payment) => (
        <span className="text-[12.5px] text-ink-700">{billMap.get(payment.billId)?.customerName ?? '—'}</span>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      cell: (payment) => <Badge tone="neutral">{payment.method}</Badge>,
    },
    {
      key: 'kind',
      header: 'Type',
      cell: (payment) =>
        payment.kind === 'ADVANCE' ? <Badge tone="success">Advance</Badge> : <span className="text-[11.5px] text-ink-400">Bill</span>,
      headerClassName: 'hidden md:table-cell',
      className: 'hidden md:table-cell',
    },
    {
      key: 'reference',
      header: 'Reference',
      cell: (payment) => <span className="text-[11.5px] text-ink-500">{payment.reference || '—'}</span>,
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (payment) => (
        <span className="text-[13px] font-semibold tabular-nums text-ink-900">{formatINR(payment.amount)}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Money in"
        title="Payments"
        description="Every rupee collected, linked to its bill. Collections are separate from sales value."
        actions={
          <Button
            variant="secondary"
            leadingIcon={<Download className="h-4 w-4" />}
            onClick={() =>
              downloadCsv(
                `zine-payments-${today}`,
                filtered.map((payment) => ({
                  Date: formatDateTime(payment.paidAt),
                  Bill: billMap.get(payment.billId)?.billNumber ?? '',
                  Customer: billMap.get(payment.billId)?.customerName ?? '',
                  Method: payment.method,
                  Type: payment.kind,
                  Reference: payment.reference ?? '',
                  Amount: payment.amount / 100,
                })),
              )
            }
          >
            Export CSV
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Collected today" value={formatINR(todayTotal)} />
        <Metric label="Collected this month" value={formatINR(monthTotal)} />
        <Metric label="Payments recorded" value={String(payments.length)} />
      </div>

      <Card className="mb-4 p-3">
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            { value: 'ALL', label: 'All', count: payments.length },
            ...PAYMENT_METHODS.map((option) => ({
              value: option.value as MethodFilter,
              label: option.label,
              count: payments.filter((payment) => payment.method === option.value).length,
            })),
          ]}
        />
      </Card>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(payment) => payment.id}
        empty={
          <EmptyState
            icon={<Wallet className="h-5 w-5" />}
            title="No payments recorded"
            description="Payments appear here as soon as they are taken against a bill."
          />
        }
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-ink-900">{value}</p>
    </Card>
  );
}
