import { CalendarDays, Pencil, Phone, ReceiptText } from 'lucide-react';
import type { Appointment, Bill, Customer } from '@/types';
import { APPOINTMENT_STATUS, BILL_STATUS } from '@/utils/constants';
import { formatDate, formatTime } from '@/utils/date';
import { formatINR } from '@/utils/money';
import { Avatar, StatusPill } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Drawer } from '@/components/common/Modal';

export interface CustomerSummary {
  customer: Customer;
  visits: number;
  outstanding: number;
}

function MiniStat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-ink-200/70 bg-white/70 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">{label}</p>
      <p
        className={
          danger
            ? 'mt-1 font-display text-[18px] font-medium text-rose-600 tabular-nums'
            : 'mt-1 font-display text-[18px] font-medium text-ink-900 tabular-nums'
        }
      >
        {value}
      </p>
    </div>
  );
}

export function CustomerDrawer({
  open,
  summary,
  bills,
  appointments,
  onClose,
  onEdit,
  onNewBill,
}: {
  open: boolean;
  summary: CustomerSummary | null;
  bills: Bill[];
  appointments: Appointment[];
  onClose: () => void;
  onEdit: () => void;
  onNewBill: () => void;
}) {
  const customer = summary?.customer;

  return (
    <Drawer
      open={open && Boolean(customer)}
      onClose={onClose}
      title={customer?.name}
      subtitle={customer ? `${customer.phone}${customer.email ? ` · ${customer.email}` : ''}` : undefined}
      size="lg"
      footer={
        customer && (
          <>
            <Button variant="secondary" leadingIcon={<Pencil className="h-4 w-4" />} onClick={onEdit}>
              Edit
            </Button>
            <Button leadingIcon={<ReceiptText className="h-4 w-4" />} onClick={onNewBill}>
              New bill
            </Button>
          </>
        )
      }
    >
      {summary && customer && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar name={customer.name} size="lg" />
            <div>
              <p className="font-display text-lg text-ink-900">{customer.name}</p>
              <p className="flex items-center gap-1.5 text-[12px] text-ink-500">
                <Phone className="h-3 w-3" /> {customer.phone}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Lifetime spend" value={formatINR(customer.totalSpend)} />
            <MiniStat label="Visits" value={String(summary.visits)} />
            <MiniStat
              label="Outstanding"
              value={formatINR(summary.outstanding)}
              danger={summary.outstanding > 0}
            />
          </div>

          {customer.notes && (
            <div className="rounded-xl border border-gold-200/70 bg-gold-50/50 p-3 text-[12.5px] leading-relaxed text-gold-900">
              <span className="label mb-1 block text-gold-700">Notes</span>
              {customer.notes}
            </div>
          )}

          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink-800">
              <ReceiptText className="h-3.5 w-3.5 text-gold-600" /> Bill history
            </h4>
            {bills.length === 0 ? (
              <p className="rounded-xl border border-dashed border-ink-200 px-3 py-4 text-center text-[12px] text-ink-400">
                No bills yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {bills.map((bill) => (
                  <li
                    key={bill.id}
                    className="flex items-center gap-2 rounded-xl border border-ink-200/70 bg-white/70 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium text-ink-800">{bill.billNumber}</p>
                      <p className="text-[11px] text-ink-500">
                        {formatDate(bill.billDate, 'd MMM yyyy')} · {bill.employeeName}
                      </p>
                    </div>
                    <span className="text-[12.5px] font-semibold tabular-nums text-ink-900">
                      {formatINR(bill.total)}
                    </span>
                    <StatusPill meta={BILL_STATUS[bill.status]} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink-800">
              <CalendarDays className="h-3.5 w-3.5 text-gold-600" /> Appointments
            </h4>
            {appointments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-ink-200 px-3 py-4 text-center text-[12px] text-ink-400">
                No appointments yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {appointments.slice(0, 8).map((appointment) => (
                  <li
                    key={appointment.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-ink-200/70 bg-white/70 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-ink-800">
                        {appointment.serviceNames.join(' · ') || 'Appointment'}
                      </p>
                      <p className="text-[11px] text-ink-500">
                        {formatDate(appointment.startAt, 'd MMM yyyy')} · {formatTime(appointment.startAt)} ·{' '}
                        {appointment.employeeName}
                      </p>
                    </div>
                    <StatusPill meta={APPOINTMENT_STATUS[appointment.status]} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="rounded-xl bg-ink-50 p-3 text-[12px] text-ink-500">
            Registered {formatDate(customer.createdAt, 'd MMM yyyy')}
          </div>
        </div>
      )}
    </Drawer>
  );
}
