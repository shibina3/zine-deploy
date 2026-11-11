import { useState } from 'react';
import { Plus, Truck } from 'lucide-react';
import type { Supplier } from '@/types';
import { saveSupplier } from '@/db/repositories/inventoryRepo';
import { useSuppliers } from '@/hooks/useDb';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { Avatar } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Field, Input, Textarea } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';
import { EmptyState, PageHeader } from '@/components/common/PageHeader';

export function SuppliersPage() {
  const suppliers = useSuppliers();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title="Suppliers"
        description="Keep purchase contacts together so stock entries always reference the right vendor."
        actions={
          <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            Add supplier
          </Button>
        }
      />

      {suppliers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Truck className="h-5 w-5" />}
            title="No suppliers yet"
            description="Add the vendors you buy products from."
            action={
              <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                Add supplier
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((supplier) => (
            <Card key={supplier.id} className="p-4">
              <div className="flex items-center gap-3">
                <Avatar name={supplier.name} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-ink-900">{supplier.name}</p>
                  <p className="text-[11.5px] text-ink-500">{supplier.phone || 'No phone'}</p>
                </div>
              </div>
              {supplier.address && <p className="mt-3 text-[12px] leading-relaxed text-ink-500">{supplier.address}</p>}
              <div className="mt-3 border-t border-ink-100 pt-2.5">
                <Button size="sm" variant="ghost" onClick={() => setEditing(supplier)}>
                  Edit details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SupplierDialog
        open={creating || Boolean(editing)}
        supplier={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function SupplierDialog({
  open,
  supplier,
  onClose,
}: {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(supplier?.name ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [email, setEmail] = useState(supplier?.email ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [notes, setNotes] = useState(supplier?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [key, setKey] = useState('');

  const currentKey = supplier?.id ?? (open ? 'new' : '');
  if (open && key !== currentKey) {
    setKey(currentKey);
    setName(supplier?.name ?? '');
    setPhone(supplier?.phone ?? '');
    setEmail(supplier?.email ?? '');
    setAddress(supplier?.address ?? '');
    setNotes(supplier?.notes ?? '');
    setError('');
  }

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await saveSupplier({
        id: supplier?.id,
        name,
        phone,
        email,
        address,
        notes,
      });
      notifySuccess(supplier ? 'Supplier updated' : 'Supplier added', name);
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not save the supplier.';
      setError(message);
      notifyError('Could not save supplier', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={supplier ? 'Edit supplier' : 'Add supplier'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy}>
            {supplier ? 'Save changes' : 'Add supplier'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Supplier name" required>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Beauty Essentials Wholesale" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="080 2233 4455" />
          </Field>
          <Field label="Email">
            <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </Field>
        </div>
        <Field label="Address">
          <Input value={address} onChange={(event) => setAddress(event.target.value)} />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}
