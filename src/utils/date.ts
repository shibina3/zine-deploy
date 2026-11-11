import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { DateString, Epoch, MonthString, TimeString } from '@/types';

/** Local-time ISO date `YYYY-MM-DD` for a Date. */
export function toISODate(date: Date): DateString {
  return format(date, 'yyyy-MM-dd');
}

export function todayISO(): DateString {
  return toISODate(new Date());
}

/** Parse `YYYY-MM-DD` as a *local* date (never UTC-shifted). */
export function parseDateString(value: DateString): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** `10 Nov 2026` */
export function formatDate(value: Epoch | Date | DateString, pattern = 'd MMM yyyy'): string {
  const date = toDate(value);
  return isValid(date) ? format(date, pattern) : '—';
}

/** `10 Nov 2026, 4:30 pm` */
export function formatDateTime(value: Epoch | Date | DateString): string {
  return formatDate(value, 'd MMM yyyy, h:mm a');
}

/** `4:30 pm` */
export function formatTime(value: Epoch | Date | DateString): string {
  return formatDate(value, 'h:mm a');
}

/** `16:30` */
export function formatClock(value: Epoch | Date | DateString): string {
  return formatDate(value, 'HH:mm');
}

export function toDate(value: Epoch | Date | DateString): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  return parseDateString(value);
}

export function dayRange(value: DateString): { from: Epoch; to: Epoch } {
  const date = parseDateString(value);
  return { from: startOfDay(date).getTime(), to: endOfDay(date).getTime() };
}

export function monthKey(value: Epoch | Date | DateString): MonthString {
  return formatDate(value, 'yyyy-MM');
}

export function monthRange(month: MonthString): { from: Epoch; to: Epoch; label: string } {
  const date = parseDateString(`${month}-01`);
  return {
    from: startOfMonth(date).getTime(),
    to: endOfMonth(date).getTime(),
    label: format(date, 'MMMM yyyy'),
  };
}

export function monthLabel(month: MonthString): string {
  return formatDate(`${month}-01`, 'MMMM yyyy');
}

export function currentMonth(): MonthString {
  return format(new Date(), 'yyyy-MM');
}

export function shiftMonth(month: MonthString, delta: number): MonthString {
  const date = parseDateString(`${month}-01`);
  return format(new Date(date.getFullYear(), date.getMonth() + delta, 1), 'yyyy-MM');
}

/** Combines an ISO date and `HH:mm` into an epoch using local time. */
export function combineDateTime(date: DateString, time: TimeString): Epoch {
  const base = parseDateString(date);
  const [hours, minutes] = time.split(':').map(Number);
  base.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return base.getTime();
}

export function timeFromEpoch(value: Epoch): TimeString {
  return format(new Date(value), 'HH:mm');
}

export function dateFromEpoch(value: Epoch): DateString {
  return format(new Date(value), 'yyyy-MM-dd');
}

/** Inclusive day count between two ISO dates. */
export function daysBetweenInclusive(from: DateString, to: DateString): number {
  return Math.max(1, differenceInCalendarDays(parseDateString(to), parseDateString(from)) + 1);
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (!hours) return `${mins} min`;
  return mins ? `${hours} hr ${mins} min` : `${hours} hr${hours > 1 ? 's' : ''}`;
}

export function weekdayShort(value: Epoch | Date | DateString): string {
  return formatDate(value, 'EEE');
}

export function weekdayLong(value: Epoch | Date | DateString): string {
  return formatDate(value, 'EEEE');
}

export function isToday(value: Epoch | Date | DateString): boolean {
  return formatDate(value, 'yyyy-MM-dd') === todayISO();
}

export function startOfWeekEpoch(date: Date): Epoch {
  return startOfWeek(date, { weekStartsOn: 1 }).getTime();
}

export function endOfWeekEpoch(date: Date): Epoch {
  return endOfWeek(date, { weekStartsOn: 1 }).getTime();
}

export function weekDays(date: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  });
}

export function addDaysISO(value: DateString, days: number): DateString {
  return toISODate(addDays(parseDateString(value), days));
}

/** `just now`, `12 min ago`, `3 days ago` */
export function timeAgo(value?: Epoch): string {
  if (!value) return 'never';
  const diff = Date.now() - value;
  if (diff < 60_000) return 'just now';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return formatDate(value);
}

/** Parses a `YYYY-MM-DD` string coming from an <input type="date">. */
export function safeDate(value?: string): DateString {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayISO();
}

export function epochFromISO(value: DateString): Epoch {
  return parseISO(value).getTime();
}
