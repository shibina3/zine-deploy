import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import type { Offer, OfferType, Paise } from '@/types';
import { saveOffer } from '@/db/repositories/offerRepo';
import { useServices } from '@/hooks/useDb';
import { OFFER_TYPE_LABEL } from '@/utils/constants';
import { formatINR, sumPaise } from '@/utils/money';
import { cn } from '@/utils/cn';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { Button } from '@/components/common/Button';
import { Field, Input, MoneyInput, Select, Switch } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';

export function OfferDialog({
  open,
  offer,
  onClose,
}: {
  open: boolean;
  offer: Offer | null;
  onClose: () => void;
}) {
  const services = useServices();
  const [name, setName] = useState('');
  const [type, setType] = useState<OfferType>('COMBO');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [offerPrice, setOfferPrice] = useState<Paise>(0);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(offer?.name ?? '');
    setType(offer?.type ?? 'COMBO');
    setServiceIds(offer?.serviceIds ?? []);
    setOfferPrice(offer?.offerPrice ?? 0);
    setDiscountPercent(offer?.discountPercent ?? 10);
    setValidFrom(offer?.validFrom ?? '');
    setValidTo(offer?.validTo ?? '');
    setIsActive(offer?.isActive ?? true);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, offer?.id]);

  const menuTotal = useMemo(
    () =>
      sumPaise(
        services
          .filter((service) => serviceIds.includes(service.id))
          .map((service) => service.price),
      ),
    [services, serviceIds],
  );
  const savings = Math.max(0, menuTotal - offerPrice);

  const submit = async () => {
    setError('');
    if (!name.trim()) return setError('Give the offer a name.');
    if (!serviceIds.length) return setError('Select the services in this offer.');
    if (offerPrice < 0) return setError('Offer price cannot be negative.');
    if (menuTotal > 0 && offerPrice > menuTotal) return setError('Offer price is higher than the menu total.');

    setBusy(true);
    try {
      await saveOffer({
        id: offer?.id,
        name,
        description: offer?.description,
        type,
        serviceIds,
        offerPrice,
        discountPercent: type === 'PERCENTAGE' || type === 'PROMO' ? discountPercent : undefined,
        validFrom: validFrom || undefined,
        validTo: validTo || undefined,
        conditions: offer?.conditions,
        isActive,
      });
      notifySuccess(offer ? 'Offer updated' : 'Offer created', name);
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not save the offer.';
      setError(message);
      notifyError('Could not save offer', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={offer ? 'Edit offer' : 'New offer'}
      description="Offers keep the price used at billing time — editing later never changes old bills."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy}>
            {offer ? 'Save changes' : 'Create offer'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Offer name" required>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Hair Care Combo"
              autoFocus
            />
          </Field>
          <Field label="Offer type" required>
            <Select value={type} onChange={(event) => setType(event.target.value as OfferType)}>
              {(Object.keys(OFFER_TYPE_LABEL) as OfferType[]).map((value) => (
                <option key={value} value={value}>
                  {OFFER_TYPE_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div>
          <label className="label mb-1.5 block">Services in this offer</label>
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-ink-200/70 p-2">
            {services.map((service) => {
              const active = serviceIds.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() =>
                    setServiceIds((ids) =>
                      ids.includes(service.id)
                        ? ids.filter((id) => id !== service.id)
                        : [...ids, service.id],
                    )
                  }
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors',
                    active
                      ? 'border-ink-900 bg-ink-900 text-cream'
                      : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300',
                  )}
                >
                  {active && <Check className="h-3 w-3 text-gold-300" />}
                  {service.name}
                  <span className={active ? 'text-gold-300/80' : 'text-ink-400'}>
                    {formatINR(service.price)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Menu total">
            <div className="flex h-10 items-center rounded-xl border border-ink-200 bg-ink-50 px-3 text-[13px] font-medium tabular-nums text-ink-700">
              {formatINR(menuTotal)}
            </div>
          </Field>
          <Field
            label="Offer price"
            required
            hint={savings > 0 ? `Customer saves ${formatINR(savings)}` : undefined}
          >
            <MoneyInput value={offerPrice} onChange={setOfferPrice} />
          </Field>
          {(type === 'PERCENTAGE' || type === 'PROMO') && (
            <Field label="Discount %" required>
              <Input
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(event) =>
                  setDiscountPercent(Math.min(100, Math.max(0, Number(event.target.value) || 0)))
                }
              />
            </Field>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Valid from">
            <Input type="date" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} />
          </Field>
          <Field label="Valid until">
            <Input type="date" value={validTo} onChange={(event) => setValidTo(event.target.value)} />
          </Field>
        </div>

        <div className="rounded-xl border border-ink-200/80 bg-ink-50/60 p-3">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Active offer"
            description="Inactive offers stay in history but cannot be applied to new bills."
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