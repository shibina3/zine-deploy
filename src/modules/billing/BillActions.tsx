import { useEffect, useState } from 'react';
import type { Bill, Paise, PaymentMethod } from '@/types';
import { addPayment, createRefund } from '@/db/repositories/billingRepo';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { formatINR } from '@/utils/money';
import { PAYMENT_METHODS } from '@/utils/constants';
import { Button } from '@/components/common/Button';
import { Field, Input, MoneyInput, Select, Textarea } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';

export function PaymentDialog({
  bill,
  open,
  onClose,
}: {
  bill: Bill | null;
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState<Paise>(0);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && bill) {
      setAmount(bill.balance);
      setMethod('CASH');
      setReference('');
    }
  }, [open, bill]);

  const submit = async () => {
    if (!bill) return;
    setBusy(true);
    try {
      await addPayment(bill.id, { amount, method, reference });
      notifySuccess('Payment recorded', `${formatINR(amount)} against ${bill.billNumber}`);
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
      title="Record payment"
      description={bill ? `${bill.billNumber} · balance ${formatINR(bill.balance)}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy} disabled={!amount}>
            Record {formatINR(amount)}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Amount received" required hint={`Outstanding ${bill ? formatINR(bill.balance) : '—'}`}>
          <MoneyInput value={amount} onChange={setAmount} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Method" required>
            <Select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reference (optional)">
            <Input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="UPI ref / card last 4"
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export function RefundDialog({
  bill,
  open,
  onClose,
}: {
  bill: Bill | null;
  open: boolean;
  onClose: () => void;
}) {
  const refundable = bill ? Math.max(0, bill.paid - bill.refunded) : 0;
  const [amount, setAmount] = useState<Paise>(0);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(refundable);
      setMethod('CASH');
      setReason('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bill?.id]);

  const submit = async () => {
    if (!bill) return;
    setBusy(true);
    try {
      await createRefund(bill.id, { amount, method, reason });
      notifySuccess('Refund recorded', `${formatINR(amount)} · original payment history preserved`);
      onClose();
    } catch (caught) {
      notifyError('Could not record refund', caught instanceof Error ? caught.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Record refund"
      description={bill ? `${bill.billNumber} · refundable ${formatINR(refundable)}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="wine"
            onClick={() => void submit()}
            loading={busy}
            disabled={!amount || reason.trim().length < 3}
          >
            Refund {formatINR(amount)}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Refund amount" required hint={`Maximum ${formatINR(refundable)}`}>
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
        <Field label="Reason" required hint="Saved in the audit trail.">
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Customer unhappy with the service…"
          />
        </Field>
        <p className="rounded-xl bg-gold-50 px-3 py-2 text-[11.5px] leading-relaxed text-gold-900">
          The original payment rows stay untouched. This refund appears separately in reports.
        </p>
      </div>
    </Modal>
  );
}
