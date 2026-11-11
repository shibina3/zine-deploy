import { useState } from 'react';
import type { IncomeSource, PaymentMethod } from '@/types';
import { saveIncome } from '@/db/repositories/financeRepo';
import { PAYMENT_METHODS } from '@/utils/constants';
import { todayISO } from '@/utils/date';
import { formatINR } from '@/utils/money';
import { Button } from '@/components/common/Button';
import { Field, Input, MoneyInput, Select } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';
import { notifyError, notifySuccess } from '@/components/common/toastStore';

const SOURCES: Array<{ value: IncomeSource; label: string }> = [
  { value: 'SERVICE', label: 'Service income' },
  { value: 'PRODUCT', label: 'Product sales' },
  { value: 'BRIDAL', label: 'Bridal booking' },
  { value: 'OTHER', label: 'Other income' },
];

export function IncomeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [source, setSource] = useState<IncomeSource>('OTHER');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await saveIncome({ source, description, amount, date, method });
      notifySuccess('Income recorded', `${description} · ${formatINR(amount)}`);
      setDescription('');
      setAmount(0);
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not record income.';
      setError(message);
      notifyError('Could not record income', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Add income"
      description="Use this for income that is not already captured by a bill."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy}>
            Record income
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Source">
          <Select value={source} onChange={(event) => setSource(event.target.value as IncomeSource)}>
            {SOURCES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Description" required>
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Gift voucher sale"
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount" required>
            <MoneyInput value={amount} onChange={setAmount} />
          </Field>
          <Field label="Date" required>
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

        {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}
