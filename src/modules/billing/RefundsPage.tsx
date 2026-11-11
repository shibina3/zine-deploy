import { useMemo } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import type { Refund } from '@/types';
import { useBills, useRefunds } from '@/hooks/useDb';
import { downloadCsv } from '@/services/exports/csv';
import { currentMonth, formatDateTime, monthRange, todayISO } from '@/utils/date';
import { formatINR, sumPaise } from '@/utils/money';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { DataTable, type Column } from '@/components/common/DataTable';
import { EmptyState, PageHeader } from '@/components/common/PageHeader';

export function RefundsPage() {
  const refunds = useRefunds();
  const bills = useBills();
  const today = todayISO();
  const month = monthRange(currentMonth());

  const billMap = useMemo(() => new Map(bills.map((bill) => [bill.id, bill])), [bills]);
  const monthTotal = sumPaise(
    refunds
      .filter((refund) => refund.refundedAt >= month.from && refund.refundedAt <= month.to)
      .map((refund) => refund.amount),
  );

  const columns: Column<Refund>[] = [
    {
      key: 'date',
      header: 'Refunded',
      cell: (refund) => (
        <div>
          <p className="text-[12.5px] font-medium text-ink-800">{formatDateTime(refund.refundedAt)}</p>
          <p className="text-[11px] text-ink-500">{refund.billNumber}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (refund) => (
        <span className="text-[12.5px] text-ink-700">
          {billMap.get(refund.billId)?.customerName ?? '—'}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      cell: (refund) => <Badge tone="neutral">{refund.method}</Badge>,
    },
    {
      key: 'reason',
      header: 'Reason',
      cell: (refund) => (
        <span className="line-clamp-2 max-w-[280px] text-[12px] text-ink-500">{refund.reason}</span>
      ),
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (refund) => (
        <span className="text-[13px] font-semibold tabular-nums text-rose-600">− {formatINR(refund.amount)}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Money out"
        title="Refunds"
        description="Refunds are separate transactions. The original bill and its payments stay untouched for audit."
        actions={
          <Button
            variant="secondary"
            leadingIcon={<Download className="h-4 w-4" />}
            onClick={() =>
              downloadCsv(
                `zine-refunds-${today}`,
                refunds.map((refund) => ({
                  Date: formatDateTime(refund.refundedAt),
                  Bill: refund.billNumber,
                  Customer: billMap.get(refund.billId)?.customerName ?? '',
                  Method: refund.method,
                  Reason: refund.reason,
                  Amount: refund.amount / 100,
                })),
              )
            }
          >
            Export CSV
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">Refunded this month</p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-rose-600">
            {formatINR(monthTotal)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">Refund count</p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-ink-900">{refunds.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">All-time refunds</p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-ink-900">
            {formatINR(sumPaise(refunds.map((refund) => refund.amount)))}
          </p>
        </Card>
      </div>

      <DataTable
        columns={columns}
        rows={refunds}
        rowKey={(refund) => refund.id}
        empty={
          <EmptyState
            icon={<RotateCcw className="h-5 w-5" />}
            title="No refunds recorded"
            description="Refunds are created from a bill’s detail panel and always require a reason."
          />
        }
      />
    </div>
  );
}
