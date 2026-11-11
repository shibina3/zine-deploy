import { useEffect, useState } from 'react';
import type { Paise, Service } from '@/types';
import { saveService } from '@/db/repositories/serviceRepo';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { SERVICE_CATEGORIES } from '@/utils/constants';
import { Button } from '@/components/common/Button';
import { Field, Input, MoneyInput, Select, Switch, Textarea } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';

export function ServiceDialog({
  open,
  service,
  onClose,
}: {
  open: boolean;
  service: Service | null;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Hair');
  const [price, setPrice] = useState<Paise>(0);
  const [duration, setDuration] = useState(45);
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(service?.name ?? '');
    setCategory(service?.category ?? 'Hair');
    setPrice(service?.price ?? 0);
    setDuration(service?.durationMinutes ?? 45);
    setDescription(service?.description ?? '');
    setIsActive(service?.isActive ?? true);
    setError('');
  }, [open, service]);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await saveService({
        id: service?.id,
        name,
        category,
        price,
        durationMinutes: duration,
        description,
        isActive,
      });
      notifySuccess(service ? 'Service updated' : 'Service added', name);
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not save the service.';
      setError(message);
      notifyError('Could not save service', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={service ? 'Edit service' : 'New service'}
      description="The duration is used to block time in the appointment calendar."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy}>
            {service ? 'Save changes' : 'Add service'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Service name" required>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Hair Spa" autoFocus />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Category" required>
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              {SERVICE_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Price" required>
            <MoneyInput value={price} onChange={setPrice} />
          </Field>
        </div>

        <Field label="Duration (minutes)" required hint="Used to calculate appointment end times.">
          <Input
            type="number"
            min={5}
            step={5}
            value={duration}
            onChange={(event) => setDuration(Math.max(5, Number(event.target.value) || 5))}
          />
        </Field>

        <Field label="Description (optional)">
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Includes wash, massage and blow dry."
          />
        </Field>

        <div className="rounded-xl border border-ink-200/80 bg-ink-50/60 p-3">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Available for billing"
            description="Inactive services stay on old bills but cannot be selected for new ones."
          />
        </div>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
