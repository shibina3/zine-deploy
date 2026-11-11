import { Plus } from 'lucide-react';
import type { Appointment } from '@/types';
import { cn } from '@/utils/cn';
import { dateFromEpoch, formatDate, formatTime, isToday, toISODate, weekDays } from '@/utils/date';

export function WeekView({
  anchorDate,
  appointments,
  onSelectDate,
  onNew,
}: {
  anchorDate: string;
  appointments: Appointment[];
  onSelectDate: (dateISO: string) => void;
  onNew: (dateISO: string) => void;
}) {
  const days = weekDays(new Date(`${anchorDate}T12:00:00`)).map((date) => toISODate(date));

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
      {days.map((day) => {
        const items = appointments
          .filter((appointment) => dateFromEpoch(appointment.startAt) === day)
          .sort((a, b) => a.startAt - b.startAt);
        return (
          <div
            key={day}
            className={cn(
              'flex min-h-[190px] flex-col rounded-2xl border border-ink-200/70 bg-porcelain p-2.5 shadow-card',
              isToday(day) && 'border-gold-300 ring-1 ring-gold-300/50',
            )}
          >
            <button onClick={() => onSelectDate(day)} className="text-left">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                {formatDate(day, 'EEE')}
              </p>
              <p className="font-display text-xl leading-tight text-ink-900">{formatDate(day, 'd')}</p>
            </button>
            <div className="mt-2 flex-1 space-y-1.5">
              {items.slice(0, 5).map((appointment) => (
                <button
                  key={appointment.id}
                  onClick={() => onSelectDate(day)}
                  className="block w-full rounded-lg border border-ink-100 bg-white px-2 py-1.5 text-left hover:border-gold-300"
                >
                  <p className="text-[10px] font-semibold tabular-nums text-ink-500">
                    {formatTime(appointment.startAt)}
                  </p>
                  <p className="truncate text-[11.5px] font-medium text-ink-800">
                    {appointment.customerName}
                  </p>
                </button>
              ))}
              {items.length > 5 && <p className="text-[10px] text-ink-400">+{items.length - 5} more</p>}
              {items.length === 0 && (
                <button
                  onClick={() => onNew(day)}
                  className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-ink-200 py-2 text-[10.5px] text-ink-400 hover:border-gold-300 hover:text-gold-700"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
