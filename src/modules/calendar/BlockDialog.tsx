import { useEffect, useState } from 'react';
import type { CalendarBlock } from '@/types';
import { saveBlock } from '@/db/repositories/calendarRepo';
import { useEmployees } from '@/hooks/useDb';
import { combineDateTime } from '@/utils/date';
import { cn } from '@/utils/cn';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { Button } from '@/components/common/Button';
import { Field, Input, Select, Switch, Textarea } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';

export function BlockDialog({
  open,
  block,
  presetDate,
  onClose,
}: {
  open: boolean;
  block: CalendarBlock | null;
  presetDate: string;
  onClose: () => void;
}) {
  const employees = useEmployees();
  const [scope, setScope] = useState<CalendarBlock['scope']>('SALON');
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(presetDate);
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('13:00');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setScope(block?.scope ?? 'SALON');
    setEmployeeId(block?.employeeId ?? employees[0]?.id ?? '');
    setDate(presetDate);
    setStartTime('10:00');
    setEndTime('13:00');
    setAllDay(false);
    setReason(block?.reason ?? '');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, block?.id, presetDate]);

  const submit = async () => {
    setError('');
    if (!reason.trim()) return setError('Add a reason for the block.');
    if (scope === 'EMPLOYEE' && !employeeId) return setError('Choose the employee to block.');

    const startAt = combineDateTime(date, allDay ? '00:00' : startTime);
    const endAt = combineDateTime(date, allDay ? '23:59' : endTime);
    if (endAt <= startAt) return setError('End time must be after the start time.');

    const employee = employees.find((row) => row.id === employeeId);
    setBusy(true);
    try {
      await saveBlock({
        id: block?.id,
        scope,
        employeeId: scope === 'EMPLOYEE' ? employeeId : undefined,
        employeeName: scope === 'EMPLOYEE' ? employee?.name : undefined,
        startAt,
        endAt,
        reason,
      });
      notifySuccess(block ? 'Block updated' : 'Calendar blocked', reason);
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not save the block.';
      setError(message);
      notifyError('Could not block calendar', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={block ? 'Edit blocked time' : 'Block calendar time'}
      description="Blocked periods stop conflicting appointments from being booked."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy}>
            {block ? 'Save block' : 'Block time'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label mb-1.5 block">Block</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(['SALON', 'EMPLOYEE'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                className={cn(
                  'rounded-xl border px-3 py-2 text-[12.5px] font-medium transition-colors',
                  scope === value
                    ? 'border-ink-900 bg-ink-900 text-cream'
                    : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300',
                )}
              >
                {value === 'SALON' ? 'Entire salon' : 'One employee'}
              </button>
            ))}
          </div>
        </div>

        {scope === 'EMPLOYEE' && (
          <Field label="Employee" required>
            <Select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              <option value="">Select…</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Date" required>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>

        <div className="rounded-xl border border-ink-200/80 bg-ink-50/60 p-3">
          <Switch
            checked={allDay}
            onChange={setAllDay}
            label="All day"
            description="Useful for public holidays or full-day bridal events."
          />
        </div>

        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="From" required>
              <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            </Field>
            <Field label="To" required>
              <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </Field>
          </div>
        )}

        <Field label="Reason" required hint="Shown on the calendar.">
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Public holiday / staff training / maintenance"
          />
        </Field>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
