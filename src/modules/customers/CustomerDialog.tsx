import { useEffect, useState } from 'react';
import type { Customer } from '@/types';
import { saveCustomer } from '@/db/repositories/customerRepo';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { Button } from '@/components/common/Button';
import { Field, Input, Textarea } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';

export function CustomerDialog({
  open,
  customer,
  onClose,
  onSaved,
}: {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(customer?.name ?? '');
    setPhone(customer?.phone ?? '');
    setEmail(customer?.email ?? '');
    setNotes(customer?.notes ?? '');
    setError('');
  }, [open, customer]);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const saved = await saveCustomer({ id: customer?.id, name, phone, email, notes });
      notifySuccess(customer ? 'Customer updated' : 'Customer added', `${saved.name} · ${saved.phone}`);
      onSaved(saved);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not save the customer.';
      setError(message);
      notifyError('Could not save customer', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? 'Edit customer' : 'Add customer'}
      description="Only collect what you need — name and mobile number are enough."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy}>
            {customer ? 'Save changes' : 'Add customer'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Full name" required>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Sneha Kulkarni"
            autoFocus
          />
        </Field>
        <Field label="Mobile number" required hint="Used for search, receipts and WhatsApp.">
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value.replace(/[^\d+\s-]/g, ''))}
            placeholder="99001 12233"
            inputMode="tel"
          />
        </Field>
        <Field label="Email (optional)">
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            type="email"
          />
        </Field>
        <Field label="Notes (optional)" hint="Allergies, preferences, or anything the team should know.">
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Prefers fragrance-free products."
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
