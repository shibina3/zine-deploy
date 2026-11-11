import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import type { PaymentMethod } from '@/types';
import { saveExpense } from '@/db/repositories/financeRepo';
import { useExpenseCategories } from '@/hooks/useDb';
import { PAYMENT_METHODS } from '@/utils/constants';
import { todayISO } from '@/utils/date';
import { formatINR } from '@/utils/money';
import { Button } from '@/components/common/Button';
import { Field, Input, MoneyInput, Select } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';
import { notifyError, notifySuccess } from '@/components/common/toastStore';

export function ExpenseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const categories = useExpenseCategories();
  const [category, setCategory] = useState('Miscellaneous');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setCategory(categories[0]?.name ?? 'Miscellaneous');
    setDescription('');
    setAmount(0);
    setDate(todayISO());
    setMethod('CASH');
    setInvoiceRef('');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await saveExpense({ category, description, amount, date, method, invoiceRef });
      notifySuccess('Expense recorded', `${description} · ${formatINR(amount)}`);
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not save the expense.';
      setError(message);
      notifyError('Could not save expense', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Add expense"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy}>
            Record expense
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Category" required>
          <Select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Description" required>
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Salon rent — current month"
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

        <div className="grid grid-cols-2 gap-3">
          <Field label="Method">
            <Select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Invoice ref">
            <Input value={invoiceRef} onChange={(event) => setInvoiceRef(event.target.value)} />
          </Field>
        </div>

        {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}

        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-400">
          <Receipt className="mt-0.5 h-3 w-3 shrink-0" />
          Product purchases count as a cash expense; consumed stock is counted as cost of goods, so
          profit is never double-counted.
        </p>
      </div>
    </Modal>
  );
}
