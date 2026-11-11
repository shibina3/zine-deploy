import { format } from 'date-fns';
import { Wallet } from 'lucide-react';
import { useSalaryAdvances, useSalaryPayments } from '@/hooks/useDb';
import { formatDate } from '@/utils/date';
import { formatINR } from '@/utils/money';
import { SectionCard } from '@/components/common/Card';

export function AdvancesPanel() {
  const advances = useSalaryAdvances();
  const payments = useSalaryPayments();

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <SectionCard
        title="Salary advances"
        subtitle="Unsettled advances are deducted from the next payroll"
        icon={<Wallet className="h-4 w-4" />}
      >
        {advances.length === 0 ? (
          <p className="py-4 text-center text-[12px] text-ink-400">No advances recorded.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {advances.slice(0, 8).map((advance) => (
              <li key={advance.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-ink-800">{advance.employeeName}</p>
                  <p className="text-[11px] text-ink-500">
                    {formatDate(advance.date, 'd MMM yyyy')} · {advance.method} ·{' '}
                    {advance.settledInRecordId ? 'settled' : 'outstanding'}
                  </p>
                </div>
                <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-ink-900">
                  {formatINR(advance.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Recent salary payments"
        subtitle="Every payment is booked as a salary expense"
        icon={<Wallet className="h-4 w-4" />}
      >
        {payments.length === 0 ? (
          <p className="py-4 text-center text-[12px] text-ink-400">No salary payments yet.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {payments.slice(0, 8).map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-ink-800">
                    {format(new Date(payment.paidAt), 'd MMM yyyy')} · {payment.method}
                  </p>
                  <p className="text-[11px] text-ink-500">{payment.note || 'Salary payment'}</p>
                </div>
                <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-ink-900">
                  {formatINR(payment.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
