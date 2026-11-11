import { Award, TrendingDown, TrendingUp, UserRoundCheck } from 'lucide-react';
import type { EmployeeInsight, ServiceInsight } from './analytics';
import { cn } from '@/utils/cn';
import { formatINR, formatNumber } from '@/utils/money';
import { Avatar } from '@/components/common/Badge';
import { SectionCard } from '@/components/common/Card';

function Delta({ value }: { value: number | null }) {
  if (typeof value !== 'number') return null;
  const up = value >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
        up ? 'bg-sage-50 text-sage-700' : 'bg-rose-50 text-rose-600',
      )}
    >
      {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {up ? '+' : ''}
      {value}%
    </span>
  );
}

export function TopServicesPanel({
  services,
  previousLabel,
}: {
  services: ServiceInsight[];
  previousLabel: string;
}) {
  const max = services[0]?.revenue ?? 0;
  return (
    <SectionCard
      title="Services that are a hit"
      subtitle={`Top revenue earners vs ${previousLabel}`}
      icon={<Award className="h-4 w-4" />}
    >
      {services.length === 0 ? (
        <p className="py-6 text-center text-[12.5px] text-ink-400">No services billed in this period.</p>
      ) : (
        <ul className="space-y-3">
          {services.map((service, index) => (
            <li key={service.name}>
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold',
                    index === 0 ? 'bg-gold-100 text-gold-800' : 'bg-ink-100 text-ink-500',
                  )}
                >
                  {index + 1}
                </span>
                <p className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink-800">
                  {service.name}
                </p>
                <Delta value={service.change} />
                <span className="w-[74px] shrink-0 text-right text-[12.5px] font-semibold tabular-nums text-ink-900">
                  {formatINR(service.revenue)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 pl-[30px]">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-wine-400 to-wine-600"
                    style={{ width: `${max ? Math.max(4, Math.round((service.revenue / max) * 100)) : 0}%` }}
                  />
                </div>
                <span className="shrink-0 text-[10.5px] text-ink-400">
                  {formatNumber(service.quantity)} served
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function EmployeePerformancePanel({
  employees,
  previousLabel,
}: {
  employees: EmployeeInsight[];
  previousLabel: string;
}) {
  const max = employees[0]?.revenue ?? 0;
  return (
    <SectionCard
      title="Who brought the income"
      subtitle={`Revenue and productivity vs ${previousLabel}`}
      icon={<UserRoundCheck className="h-4 w-4" />}
    >
      {employees.length === 0 ? (
        <p className="py-6 text-center text-[12.5px] text-ink-400">No attributed bills in this period.</p>
      ) : (
        <ul className="space-y-3.5">
          {employees.map((employee) => (
            <li key={employee.employeeId}>
              <div className="flex items-center gap-2.5">
                <Avatar name={employee.employeeName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-ink-900">{employee.employeeName}</p>
                  <p className="text-[10.5px] text-ink-400">
                    {employee.bills} bill{employee.bills === 1 ? '' : 's'} · avg {formatINR(employee.averageBill)}
                  </p>
                </div>
                <Delta value={employee.change} />
                <div className="w-[92px] shrink-0 text-right">
                  <p className="text-[12.5px] font-semibold tabular-nums text-ink-900">
                    {formatINR(employee.revenue)}
                  </p>
                  <p className="text-[10px] text-ink-400">{employee.share}% of revenue</p>
                </div>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sage-400 to-sage-600"
                  style={{ width: `${max ? Math.max(4, Math.round((employee.revenue / max) * 100)) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function PaymentMixPanel({
  methods,
  total,
}: {
  methods: Array<{ method: string; amount: number }>;
  total: number;
}) {
  const max = Math.max(...methods.map((row) => row.amount), 0);
  return (
    <SectionCard title="How customers paid" subtitle="Cash, UPI, card and other collections">
      {methods.length === 0 ? (
        <p className="py-5 text-center text-[12.5px] text-ink-400">No collections in this period.</p>
      ) : (
        <ul className="space-y-2.5">
          {methods.map((row) => (
            <li key={row.method}>
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium capitalize text-ink-700">{row.method.toLowerCase()}</span>
                <span className="tabular-nums text-ink-800">
                  {formatINR(row.amount)}
                  <span className="ml-1.5 text-[10.5px] text-ink-400">
                    {total ? Math.round((row.amount / total) * 100) : 0}%
                  </span>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-gold-400"
                  style={{ width: `${max ? Math.max(4, Math.round((row.amount / max) * 100)) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
