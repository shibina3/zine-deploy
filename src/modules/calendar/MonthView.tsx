import type { Appointment } from '@/types';
import { cn } from '@/utils/cn';
import { dateFromEpoch, formatDate, formatTime, isToday, toISODate } from '@/utils/date';
import { Card } from '@/components/common/Card';

export function MonthView({
  monthAnchor,
  appointments,
  onSelectDate,
}: {
  monthAnchor: string;
  appointments: Appointment[];
  onSelectDate: (dateISO: string) => void;
}) {
  const anchor = new Date(`${monthAnchor}T12:00:00`);
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const firstWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const cells: Array<string | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) =>
      toISODate(new Date(anchor.getFullYear(), anchor.getMonth(), index + 1)),
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-ink-100 bg-ink-50/60">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-500"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, index) => {
          if (!day) {
            return (
              <div
                key={`empty-${index}`}
                className="min-h-[92px] border-b border-r border-ink-100/70 bg-ink-50/20"
              />
            );
          }
          const items = appointments.filter((appointment) => dateFromEpoch(appointment.startAt) === day);
          const active = items.filter((appointment) => appointment.status !== 'CANCELLED');
          return (
            <button
              key={day}
              onClick={() => onSelectDate(day)}
              className={cn(
                'min-h-[92px] border-b border-r border-ink-100/70 p-2 text-left transition-colors hover:bg-gold-50/40',
                isToday(day) && 'bg-gold-50/60',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-[11.5px] font-semibold',
                  isToday(day) ? 'bg-ink-900 text-cream' : 'text-ink-700',
                )}
              >
                {formatDate(day, 'd')}
              </span>
              <div className="mt-1 space-y-1">
                {active.slice(0, 2).map((appointment) => (
                  <p
                    key={appointment.id}
                    className="truncate rounded bg-wine-50 px-1.5 py-0.5 text-[10px] font-medium text-wine-700"
                  >
                    {formatTime(appointment.startAt)} {appointment.customerName}
                  </p>
                ))}
                {active.length > 2 && (
                  <p className="text-[9.5px] font-medium text-ink-400">+{active.length - 2} more</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
