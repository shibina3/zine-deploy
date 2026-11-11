import { useEffect, useState } from 'react';
import type { Paise, PaymentMethod, SalaryRecord } from '@/types';
import { addSalaryPayment, createAdvance } from '@/db/repositories/payrollRepo';
import { useEmployees } from '@/hooks/useDb';
import { PAYMENT_METHODS } from '@/utils/constants';
import { formatINR } from '@/utils/money';
import { todayISO } from '@/utils/date';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { Button } from '@/components/common/Button';
import { Field, Input, MoneyInput, Select } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';

export function SalaryPaymentDialog({
  record,
  open,
  onClose,
}: {
  record: SalaryRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState<Paise>(0);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && record) {
      setAmount(Math.max(0, record.netPayable - record.paid));
      setMethod('CASH');
      setNote('');
    }
  }, [open, record]);

  const submit = async () => {
    if (!record) return;
    setBusy(true);
    try {
      await addSalaryPayment(record.id, { amount, method, note });
      notifySuccess('Salary paid', `${formatINR(amount)} · ${record.employeeName}`);
      onClose();
    } catch (caught) {
      notifyError('Could not record payment', caught instanceof Error ? caught.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Pay salary"
      description={record ? `${record.employeeName} · ${formatINR(record.netPayable - record.paid)} outstanding` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy} disabled={!amount}>
            Pay {formatINR(amount)}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Amount" required hint="Partial payments are allowed.">
          <MoneyInput value={amount} onChange={setAmount} autoFocus />
        </Field>
        <Field label="Method" required>
          <Select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Note">
          <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Cash paid at counter" />
        </Field>
        <p className="rounded-xl bg-gold-50 px-3 py-2 text-[11.5px] leading-relaxed text-gold-900">
          Payments are also recorded as an “Employee salaries” expense for finance reports.
        </p>
      </div>
    </Modal>
  );
}

export function AdvanceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const employees = useEmployees();
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState<Paise>(0);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmployeeId('');
    setAmount(0);
    setMethod('CASH');
    setDate(todayISO());
    setNote('');
  }, [open]);

  const submit = async () => {
    setBusy(true);
    try {
      await createAdvance({ employeeId, amount, method, date, note });
      notifySuccess('Advance recorded', 'It will be deducted in the next payroll.');
      onClose();
    } catch (caught) {
      notifyError('Could not record advance', caught instanceof Error ? caught.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Salary advance"
      description="Advances are deducted from the next generated payroll."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy} disabled={!employeeId || !amount}>
            Record advance
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
          <Field label="Amount" required>
            <MoneyInput value={amount} onChange={setAmount} autoFocus />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
        </div>
        <Field label="Method">
          <Select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Note">
          <Input value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
