import { useState } from 'react';
import { CalendarRange, Filter, ShieldCheck } from 'lucide-react';
import type { DashboardPeriod, DashboardPreset } from './analytics';
import { defaultDashboardPeriod } from './analytics';
import { useCurrentUser } from '@/stores/authStore';
import { useSettings } from '@/hooks/useDb';
import { formatDate } from '@/utils/date';
import { formatINR } from '@/utils/money';
import { cn } from '@/utils/cn';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { PageHeader } from '@/components/common/PageHeader';
import { SegmentedControl } from '@/components/common/Tabs';
import { useDashboardData } from './useDashboardData';
import { HeroPanel } from './HeroPanel';
import { StatTile } from './StatTile';
import { RevenueChart } from './RevenueChart';
import { ComparisonChart } from './ComparisonChart';
import {
  EmployeePerformancePanel,
  PaymentMixPanel,
  TopServicesPanel,
} from './BusinessInsights';
import {
  AppointmentsPanel,
  BackupPanel,
  BridalPanel,
  LowStockPanel,
  RecentBillsPanel,
  TeamPanel,
} from './DashboardLists';

export function DashboardPage() {
  const user = useCurrentUser();
  const settings = useSettings();
  const [period, setPeriod] = useState<DashboardPeriod>(defaultDashboardPeriod);
  const data = useDashboardData(period);
  const { analytics, resolved } = data;

  const update = (patch: Partial<DashboardPeriod>) => setPeriod((current) => ({ ...current, ...patch }));
  const changePeriod = (preset: DashboardPreset) => update({ preset });

  const periodSubtitle = resolved.singleDay
    ? `${resolved.label} · hourly view`
    : `${resolved.label} · daily view`;
  const comparisonHint = `vs ${resolved.previousLabel}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner insights"
        title="Business dashboard"
        description="Sales, collections, refunds and the people behind the revenue — with a previous-period comparison so you can spot what is working."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-200 bg-gold-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-gold-800">
            <ShieldCheck className="h-3.5 w-3.5" /> Owner only
          </span>
        }
      />

      <Card className="flex flex-wrap items-center gap-3 p-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
          <Filter className="h-3.5 w-3.5" /> Period
        </span>
        <SegmentedControl
          value={period.preset}
          onChange={changePeriod}
          options={[
            { value: 'TODAY', label: 'Today' },
            { value: 'MONTH', label: 'Monthly' },
            { value: 'CUSTOM', label: 'Custom' },
          ]}
        />

        {period.preset === 'TODAY' && (
          <input
            type="date"
            value={period.date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => update({ date: event.target.value })}
            className="h-9 rounded-xl border border-ink-200 bg-white px-2.5 text-[12.5px] text-ink-700"
          />
        )}

        {period.preset === 'MONTH' && (
          <input
            type="month"
            value={period.month}
            max={new Date().toISOString().slice(0, 7)}
            onChange={(event) => update({ month: event.target.value })}
            className="h-9 rounded-xl border border-ink-200 bg-white px-2.5 text-[12.5px] text-ink-700"
          />
        )}

        {period.preset === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={period.from}
              onChange={(event) => update({ from: event.target.value })}
              className="h-9 rounded-xl border border-ink-200 bg-white px-2.5 text-[12.5px] text-ink-700"
            />
            <span className="text-ink-400">→</span>
            <input
              type="date"
              value={period.to}
              onChange={(event) => update({ to: event.target.value })}
              className="h-9 rounded-xl border border-ink-200 bg-white px-2.5 text-[12.5px] text-ink-700"
            />
          </div>
        )}

        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-ink-100/70 px-2.5 py-1 text-[11px] font-medium text-ink-600">
          <CalendarRange className="h-3 w-3" />
          {resolved.label}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPeriod(defaultDashboardPeriod())}
          className="text-ink-500"
        >
          Reset
        </Button>
      </Card>

      <HeroPanel
        userName={user?.name ?? 'Owner'}
        owner
        today={data.today}
        periodLabel={resolved.shortLabel}
        collections={analytics.current.collections}
        sales={analytics.current.sales}
        outstanding={analytics.current.outstanding}
        billCount={analytics.current.billCount}
        pendingBills={analytics.current.pendingBills}
        appointmentCount={data.todaysAppointments.length}
        onLeaveCount={data.onLeaveToday.length}
        trend={analytics.changes.collections}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Sales billed"
          value={formatINR(analytics.current.sales)}
          hint={`${analytics.current.billCount} bill${analytics.current.billCount === 1 ? '' : 's'} · avg ${formatINR(analytics.current.averageBill)}`}
          tone="wine"
          to="/billing"
          delta={analytics.changes.sales}
          deltaLabel="vs prev"
        />
        <StatTile
          label="Cash collected"
          value={formatINR(analytics.current.collections)}
          hint={`Net ${formatINR(analytics.netCollections)} after refunds`}
          tone="gold"
          to="/payments"
          delta={analytics.changes.collections}
          deltaLabel="vs prev"
        />
        <StatTile
          label="Refunds"
          value={formatINR(analytics.current.refunds)}
          hint="Separate transactions, never deducted from billed sales"
          tone="ink"
          to="/refunds"
          delta={analytics.changes.refunds}
          deltaLabel="vs prev"
        />
        <StatTile
          label="Estimated profit"
          value={formatINR(analytics.profit.profit)}
          hint="Sales − refunds − expenses − stock consumed"
          tone="sage"
          to="/finance/reports"
          delta={analytics.changes.profit}
          deltaLabel="vs prev"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueChart
            series={analytics.series}
            title={resolved.singleDay ? 'Sales & collections by hour' : 'Sales & collections by day'}
            subtitle={periodSubtitle}
          />
        </div>
        <ComparisonChart
          points={analytics.comparison}
          currentLabel={resolved.label}
          previousLabel={resolved.previousLabel}
          change={analytics.changes.sales}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <TopServicesPanel services={analytics.topServices} previousLabel={resolved.previousLabel} />
        <EmployeePerformancePanel
          employees={analytics.employees}
          previousLabel={resolved.previousLabel}
        />
        <PaymentMixPanel methods={analytics.methods} total={analytics.current.collections} />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <AppointmentsPanel appointments={data.todaysAppointments} completed={data.completedToday} />
          <RecentBillsPanel bills={data.recentBills} />
        </div>
        <div className="space-y-5">
          <LowStockPanel levels={data.lowStock} />
          <BridalPanel bookings={data.bridalUpcoming} />
          <TeamPanel leaves={data.onLeaveToday} employeeCount={data.employees.length} />
          {settings && <BackupPanel settings={settings} />}
        </div>
      </section>

      <p className={cn('text-center text-[10.5px] text-ink-400')}>
        Dashboard figures are management estimates for {formatDate(resolved.fromISO, 'd MMM yyyy')} –{' '}
        {formatDate(resolved.toISO, 'd MMM yyyy')} ({comparisonHint}). Not a statutory accounting statement.
      </p>
    </div>
  );
}
