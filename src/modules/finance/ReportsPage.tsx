import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, TrendingUp } from 'lucide-react';
import {
  useBills,
  useRefunds,
  useExpenses,
  usePayments,
  useStockMovements,
  useBillItemsAll,
} from '@/hooks/useDb';
import {
  buildDailySeries,
  cogsFromMovements,
  collectionsByMethod,
  estimateProfit,
  salesByEmployee,
  salesByItem,
  summarisePeriod,
} from '@/modules/reports/logic';
import { downloadCsv } from '@/services/exports/csv';
import {
  addDaysISO,
  currentMonth,
  formatDate,
  monthRange,
  todayISO,
} from '@/utils/date';
import { formatCompactINR, formatINR } from '@/utils/money';
import { Button } from '@/components/common/Button';
import { Card, SectionCard } from '@/components/common/Card';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { SegmentedControl } from '@/components/common/Tabs';

type Preset = 'MONTH' | 'LAST_MONTH' | 'LAST_30' | 'CUSTOM';

export function ReportsPage() {
  const bills = useBills();
  const payments = usePayments();
  const refunds = useRefunds();
  const expenses = useExpenses();
  const movements = useStockMovements(1500);
  const items = useBillItemsAll();

  const [preset, setPreset] = useState<Preset>('MONTH');
  const [from, setFrom] = useState(addDaysISO(todayISO(), -29));
  const [to, setTo] = useState(todayISO());

  const range = useMemo(() => {
    if (preset === 'MONTH') return { from: monthRange(currentMonth()).from, to: monthRange(currentMonth()).to };
    if (preset === 'LAST_MONTH') {
      const previous = new Date();
      previous.setMonth(previous.getMonth() - 1);
      const r = monthRange(`${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`);
      return { from: r.from, to: r.to };
    }
    if (preset === 'LAST_30') {
      return { from: new Date(`${addDaysISO(todayISO(), -29)}T00:00:00`).getTime(), to: Date.now() };
    }
    return {
      from: new Date(`${from}T00:00:00`).getTime(),
      to: new Date(`${to}T23:59:59`).getTime(),
    };
  }, [preset, from, to]);

  const summary = useMemo(
    () => summarisePeriod({ bills, payments, refunds, expenses, from: range.from, to: range.to }),
    [bills, payments, refunds, expenses, range.from, range.to],
  );

  const profit = useMemo(() => {
    const operating = expenses
      .filter(
        (expense) =>
          expense.category !== 'Product purchases' &&
          new Date(`${expense.date}T12:00:00`).getTime() >= range.from &&
          new Date(`${expense.date}T12:00:00`).getTime() <= range.to,
      )
      .reduce((total, expense) => total + expense.amount, 0);
    const cogs = cogsFromMovements(movements, range.from, range.to);
    return {
      operating,
      cogs,
      profit: estimateProfit({
        netSales: Math.max(0, summary.sales - summary.refunds),
        operatingExpenses: operating,
        cogs,
      }),
    };
  }, [expenses, movements, range.from, range.to, summary.sales, summary.refunds]);

  const series = useMemo(() => {
    const days: string[] = [];
    const start = new Date(range.from);
    const end = new Date(range.to);
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      days.push(formatDate(cursor, 'yyyy-MM-dd'));
    }
    return buildDailySeries(days.slice(-45), bills, payments, expenses);
  }, [range.from, range.to, bills, payments, expenses]);

  const byEmployee = useMemo(
    () =>
      salesByEmployee(
        bills.filter((bill) => bill.billDate >= range.from && bill.billDate <= range.to),
      ),
    [bills, range.from, range.to],
  );

  const billIdsInRange = useMemo(
    () => new Set(bills.filter((bill) => bill.billDate >= range.from && bill.billDate <= range.to && bill.status !== 'CANCELLED').map((bill) => bill.id)),
    [bills, range.from, range.to],
  );

  const byService = useMemo(
    () => salesByItem(items.filter((item) => billIdsInRange.has(item.billId))).slice(0, 8),
    [items, billIdsInRange],
  );

  const byMethod = useMemo(
    () =>
      collectionsByMethod(
        payments.filter((payment) => payment.paidAt >= range.from && payment.paidAt <= range.to),
      ),
    [payments, range.from, range.to],
  );

  const employeeColumns: Column<{ employeeId: string; employeeName: string; revenue: number; bills: number }>[] = [
    {
      key: 'name',
      header: 'Employee',
      cell: (row) => <span className="text-[12.5px] font-medium text-ink-900">{row.employeeName}</span>,
    },
    {
      key: 'bills',
      header: 'Bills',
      align: 'right',
      cell: (row) => <span className="text-[12.5px] tabular-nums text-ink-600">{row.bills}</span>,
    },
    {
      key: 'revenue',
      header: 'Revenue',
      align: 'right',
      cell: (row) => (
        <span className="text-[12.5px] font-semibold tabular-nums text-ink-900">{formatINR(row.revenue)}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Reports"
        description="Sales, collections, expenses and a management profit estimate that never counts stock twice."
        actions={
          <Button
            variant="secondary"
            leadingIcon={<Download className="h-4 w-4" />}
            onClick={() =>
              downloadCsv(`zine-report-${formatDate(range.from, 'yyyy-MM-dd')}`, [
                {
                  From: formatDate(range.from, 'yyyy-MM-dd'),
                  To: formatDate(range.to, 'yyyy-MM-dd'),
                  Sales: summary.sales / 100,
                  Collections: summary.collections / 100,
                  Refunds: summary.refunds / 100,
                  Expenses: profit.operating / 100,
                  CostOfGoods: profit.cogs / 100,
                  EstimatedProfit: profit.profit / 100,
                  Outstanding: summary.outstanding / 100,
                  Bills: summary.billCount,
                },
              ])
            }
          >
            Export summary
          </Button>
        }
      />

      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-3">
        <SegmentedControl
          value={preset}
          onChange={setPreset}
          options={[
            { value: 'MONTH', label: 'This month' },
            { value: 'LAST_MONTH', label: 'Last month' },
            { value: 'LAST_30', label: 'Last 30 days' },
            { value: 'CUSTOM', label: 'Custom' },
          ]}
        />
        {preset === 'CUSTOM' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-9 rounded-xl border border-ink-200 bg-white px-2.5 text-[12.5px]"
            />
            <span className="text-ink-400">→</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-9 rounded-xl border border-ink-200 bg-white px-2.5 text-[12.5px]"
            />
          </div>
        )}
        <p className="text-[12px] text-ink-500">
          {formatDate(range.from, 'd MMM yyyy')} – {formatDate(range.to, 'd MMM yyyy')}
        </p>
      </Card>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Sales billed" value={formatINR(summary.sales)} hint={`${summary.billCount} bills`} />
        <Metric
          label="Cash collected"
          value={formatINR(summary.collections)}
          hint="Payments received"
          tone="sage"
        />
        <Metric
          label="Outstanding"
          value={formatINR(summary.outstanding)}
          hint={`${summary.pendingBills} bills with balance`}
          tone="wine"
        />
        <Metric
          label="Estimated profit"
          value={formatINR(profit.profit)}
          hint="Sales − refunds − operating − stock cost"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5">
            <div>
              <h3 className="font-display text-[17px] font-medium text-ink-900">Sales &amp; collections</h3>
              <p className="text-[12px] text-ink-500">Daily billed value against cash received</p>
            </div>
            <TrendingUp className="h-4 w-4 text-gold-600" />
          </div>
          <div className="h-[260px] px-2 pb-3 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2d8cd" strokeDasharray="3 6" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10.5, fill: '#9c8b80' }}
                  interval={series.length > 20 ? 3 : 0}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={54}
                  tick={{ fontSize: 10.5, fill: '#9c8b80' }}
                  tickFormatter={(value: number) => formatCompactINR(value)}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(198,149,46,0.08)' }}
                  formatter={(value: number, name: string) => [formatINR(value), name]}
                  contentStyle={{ borderRadius: 12, borderColor: '#e2d8cd', fontSize: 12 }}
                />
                <Bar dataKey="sales" name="Sales" fill="#b23a57" radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar
                  dataKey="collections"
                  name="Collected"
                  fill="#d6ac48"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-4">
          <SectionCard title="Profit estimate" subtitle="Management view only">
            <div className="space-y-2 text-[12.5px]">
              <Row label="Net sales" value={formatINR(Math.max(0, summary.sales - summary.refunds))} />
              <Row label="Operating expenses" value={`− ${formatINR(profit.operating)}`} />
              <Row label="Cost of goods consumed" value={`− ${formatINR(profit.cogs)}`} />
              <div className="flex items-center justify-between border-t border-ink-200 pt-2">
                <span className="font-semibold text-ink-900">Estimated profit</span>
                <span className="font-display text-[19px] font-medium tabular-nums text-ink-900">
                  {formatINR(profit.profit)}
                </span>
              </div>
            </div>
            <p className="mt-3 text-[10.5px] leading-relaxed text-ink-400">
              Product purchases are a cash expense; only consumed stock is counted as cost of goods.
              This is not a statutory accounting statement.
            </p>
          </SectionCard>

          <SectionCard title="Collections by method">
            {byMethod.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-ink-400">No payments in this range.</p>
            ) : (
              <ul className="space-y-2">
                {byMethod.map((row) => (
                  <li key={row.method} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-ink-500">{row.method}</span>
                    <span className="font-semibold tabular-nums text-ink-800">
                      {formatINR(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>


      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Employee-wise sales" subtitle="Who brought in the revenue">
          {byEmployee.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-ink-400">No bills in this range.</p>
          ) : (
            <DataTable
              columns={employeeColumns}
              rows={byEmployee}
              rowKey={(row) => row.employeeId}
              dense
              className="border-0 shadow-none"
              minWidth="360px"
            />
          )}
        </SectionCard>

        <SectionCard title="Service-wise sales" subtitle="Top services by revenue">
          {byService.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-ink-400">No services billed in this range.</p>
          ) : (
            <ul className="space-y-2">
              {byService.map((row) => (
                <li key={row.name} className="flex items-center justify-between gap-3 text-[12.5px]">
                  <span className="min-w-0 truncate text-ink-700">{row.name}</span>
                  <span className="shrink-0 text-ink-400">{row.quantity}×</span>
                  <span className="shrink-0 font-semibold tabular-nums text-ink-900">
                    {formatINR(row.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'sage' | 'wine';
}) {
  return (
    <Card className="p-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <p
        className={
          tone === 'sage'
            ? 'mt-2 font-display text-[22px] font-medium tabular-nums text-sage-700'
            : tone === 'wine'
              ? 'mt-2 font-display text-[22px] font-medium tabular-nums text-wine-700'
              : 'mt-2 font-display text-[22px] font-medium tabular-nums text-ink-900'
        }
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-ink-400">{hint}</p>}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-500">{label}</span>
      <span className="font-medium tabular-nums text-ink-800">{value}</span>
    </div>
  );
}

