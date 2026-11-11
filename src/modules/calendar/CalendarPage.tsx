import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Appointment } from '@/types';
import { useAppointments, useBlocks } from '@/hooks/useDb';
import { setAppointmentStatus } from '@/db/repositories/calendarRepo';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { APPOINTMENT_STATUS } from '@/utils/constants';
import { addDaysISO, dateFromEpoch, formatDate, toISODate, todayISO } from '@/utils/date';
import { Button, IconButton } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { SegmentedControl } from '@/components/common/Tabs';
import { DayView } from './DayView';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { AppointmentDialog } from './AppointmentDialog';
import { appointmentColumns } from './AppointmentTable';

type CalendarView = 'DAY' | 'WEEK' | 'MONTH' | 'LIST';

export function CalendarPage() {
  const appointments = useAppointments();
  const blocks = useBlocks();
  const [view, setView] = useState<CalendarView>('DAY');
  const [date, setDate] = useState(todayISO());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);

  const dayAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => dateFromEpoch(appointment.startAt) === date)
        .sort((a, b) => a.startAt - b.startAt),
    [appointments, date],
  );
  const listAppointments = useMemo(
    () => [...appointments].sort((a, b) => b.startAt - a.startAt).slice(0, 200),
    [appointments],
  );

  const shift = (direction: 1 | -1) => {
    if (view === 'MONTH') {
      const next = new Date(`${date}T12:00:00`);
      next.setMonth(next.getMonth() + direction);
      setDate(toISODate(next));
      return;
    }
    setDate(addDaysISO(date, direction * (view === 'WEEK' ? 7 : 1)));
  };

  const openNew = (preset?: string) => {
    setEditing(null);
    if (preset) setDate(preset);
    setDialogOpen(true);
  };

  const openEdit = (appointment: Appointment) => {
    setEditing(appointment);
    setDialogOpen(true);
  };

  const toggleStatus = async (appointment: Appointment) => {
    const next = appointment.status === 'COMPLETED' ? 'CONFIRMED' : 'COMPLETED';
    try {
      await setAppointmentStatus(appointment.id, next);
      notifySuccess('Appointment updated', APPOINTMENT_STATUS[next].label);
    } catch (error) {
      notifyError('Could not update', error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Diary"
        title="Appointments"
        description="Bookings, availability and salon blocks — conflicts caught before they happen."
        actions={
          <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => openNew()}>
            New appointment
          </Button>
        }
      />

      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <IconButton label="Previous" variant="secondary" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <button
            onClick={() => setDate(todayISO())}
            className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-[12px] font-medium text-ink-700 hover:border-ink-300"
          >
            Today
          </button>
          <IconButton label="Next" variant="secondary" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </IconButton>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-9 rounded-xl border border-ink-200 bg-white px-2.5 text-[12.5px] text-ink-700"
          />
          <span className="hidden text-[12.5px] font-medium text-ink-700 sm:block">
            {formatDate(date, 'MMMM yyyy')}
          </span>
        </div>
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: 'DAY', label: 'Day' },
            { value: 'WEEK', label: 'Week' },
            { value: 'MONTH', label: 'Month' },
            { value: 'LIST', label: 'List' },
          ]}
        />
      </Card>

      {view === 'DAY' && (
        <DayView
          dateISO={date}
          appointments={dayAppointments}
          blocks={blocks}
          onSelect={openEdit}
          onNew={() => openNew(date)}
        />
      )}
      {view === 'WEEK' && (
        <WeekView
          anchorDate={date}
          appointments={appointments}
          onSelectDate={(day) => {
            setDate(day);
            setView('DAY');
          }}
          onNew={openNew}
        />
      )}
      {view === 'MONTH' && (
        <MonthView
          monthAnchor={date}
          appointments={appointments}
          onSelectDate={(day) => {
            setDate(day);
            setView('DAY');
          }}
        />
      )}
      {view === 'LIST' && (
        <DataTable
          columns={appointmentColumns(toggleStatus)}
          rows={listAppointments}
          rowKey={(appointment) => appointment.id}
          onRowClick={openEdit}
          empty={<p className="py-10 text-center text-[12.5px] text-ink-400">No appointments yet.</p>}
        />
      )}

      <AppointmentDialog
        open={dialogOpen}
        appointment={editing}
        presetDate={date}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
