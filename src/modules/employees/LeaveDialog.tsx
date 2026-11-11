import { useState } from 'react';
import type { LeaveType } from '@/types';
import { requestLeave } from '@/db/repositories/employeeRepo';
import { useEmployees } from '@/hooks/useDb';
import { todayISO } from '@/utils/date';
import { Button } from '@/components/common/Button';
import { Field, Input, Select, Switch, Textarea } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';
import { notifyError, notifySuccess } from '@/components/common/toastStore';

const LEAVE_TYPES: Array<{ value: LeaveType; label: string }> = [
  { value: 'PAID', label: 'Paid leave' },
  { value: 'UNPAID', label: 'Unpaid leave' },
  { value: 'SICK', label: 'Sick leave' },
  { value: 'CASUAL', label: 'Casual leave' },
  { value: 'OTHER', label: 'Other' },
];

export function LeaveDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const employees = useEmployees();
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [type, setType] = useState<LeaveType>('CASUAL');
  const [paid, setPaid] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await requestLeave({ employeeId, startDate, endDate, type, paid, reason });
      notifySuccess('Leave recorded', 'Pending owner approval.');
      onClose();
      setReason('');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not record leave.';
      setError(message);
      notifyError('Could not record leave', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Record leave"
      description="Approved leave removes the employee from appointment availability."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy}>
            Record leave
          </Button>
        </>
      }
    >
      <div className="space-y-3">
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

        <div className="grid grid-cols-2 gap-3">
          <Field label="From" required>
            <Input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                if (endDate < event.target.value) setEndDate(event.target.value);
              }}
            />
          </Field>
          <Field label="To" required>
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </Field>
        </div>

        <Field label="Leave type">
          <Select value={type} onChange={(event) => setType(event.target.value as LeaveType)}>
            {LEAVE_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="rounded-xl border border-ink-200/80 bg-ink-50/60 p-3">
          <Switch
            checked={paid}
            onChange={setPaid}
            label="Paid leave"
            description="Paid leave never reduces salary. Unpaid leave is deducted in payroll."
          />
        </div>

        <Field label="Reason" required>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>

        {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}
