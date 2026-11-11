import { useEffect, useState } from 'react';
import { Building2, Clock, Save } from 'lucide-react';
import type { BusinessHours } from '@/types';
import { getSettings, storageEstimate, updateSettings } from '@/db/repositories/settingsRepo';
import { WEEKDAYS_SHORT } from '@/utils/constants';
import { bytesToSize } from '@/utils/misc';
import { cn } from '@/utils/cn';
import { Button } from '@/components/common/Button';
import { Card, SectionCard } from '@/components/common/Card';
import { Field, Input } from '@/components/common/Field';
import { notifyError, notifySuccess } from '@/components/common/toastStore';

export function BusinessSettings() {
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('');
  const [tagline, setTagline] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [taxLabel, setTaxLabel] = useState('GST');
  const [taxPercent, setTaxPercent] = useState(0);
  const [hours, setHours] = useState<BusinessHours[]>([]);
  const [storage, setStorage] = useState<{ usage: number; quota: number; persisted: boolean } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const settings = await getSettings();
      setBusinessName(settings.businessName);
      setTagline(settings.tagline);
      setAddress(settings.address);
      setPhone(settings.phone);
      setEmail(settings.email);
      setGstin(settings.gstin);
      setTaxLabel(settings.taxLabel);
      setTaxPercent(settings.taxPercent);
      setHours(settings.businessHours);
      setStorage(await storageEstimate());
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      await updateSettings({
        businessName,
        tagline,
        address,
        phone,
        email,
        gstin,
        taxLabel,
        taxPercent,
        businessHours: hours,
      });
      notifySuccess('Business profile saved', 'Applied to receipts and new bills.');
    } catch (error) {
      notifyError('Could not save', error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const setDay = (index: number, patch: Partial<BusinessHours>) => {
    setHours((previous) => previous.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  };

  if (loading) {
    return <Card className="p-8 text-center text-[12.5px] text-ink-400">Loading settings…</Card>;
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Business profile"
        subtitle="Shown on receipts and reports"
        icon={<Building2 className="h-4 w-4" />}
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business name" required>
              <Input value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
            </Field>
            <Field label="Tagline">
              <Input
                value={tagline}
                onChange={(event) => setTagline(event.target.value)}
                placeholder="Hair · Skin · Bridal"
              />
            </Field>
          </div>
          <Field label="Address">
            <Input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="12, 5th Cross, Indiranagar, Bengaluru"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Phone">
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
            <Field label="GSTIN" hint="Optional">
              <Input value={gstin} onChange={(event) => setGstin(event.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tax label">
              <Input value={taxLabel} onChange={(event) => setTaxLabel(event.target.value)} placeholder="GST" />
            </Field>
            <Field label="Default tax %" hint="Applied to new bills; 0 disables tax.">
              <Input
                type="number"
                min={0}
                max={28}
                value={taxPercent}
                onChange={(event) =>
                  setTaxPercent(Math.min(28, Math.max(0, Number(event.target.value) || 0)))
                }
              />
            </Field>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Business hours"
        subtitle="Used to detect appointments outside working hours"
        icon={<Clock className="h-4 w-4" />}
      >
        <div className="space-y-2">
          {hours.map((day, index) => (
            <div
              key={index}
              className={cn(
                'flex flex-wrap items-center gap-3 rounded-xl border border-ink-200/70 px-3 py-2',
                day.closed && 'bg-ink-50/60',
              )}
            >
              <span className="w-10 text-[12.5px] font-semibold text-ink-800">{WEEKDAYS_SHORT[index]}</span>
              <button
                type="button"
                onClick={() => setDay(index, { closed: !day.closed })}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.06em]',
                  day.closed ? 'bg-rose-50 text-rose-600' : 'bg-sage-50 text-sage-700',
                )}
              >
                {day.closed ? 'Closed' : 'Open'}
              </button>
              {!day.closed && (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={day.open}
                    onChange={(event) => setDay(index, { open: event.target.value })}
                    className="h-8 rounded-lg border border-ink-200 bg-white px-2 text-[12px]"
                  />
                  <span className="text-ink-400">→</span>
                  <input
                    type="time"
                    value={day.close}
                    onChange={(event) => setDay(index, { close: event.target.value })}
                    className="h-8 rounded-lg border border-ink-200 bg-white px-2 text-[12px]"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Local storage" subtitle="Salon data lives in this browser">
        <div className="grid gap-3 text-[12.5px] sm:grid-cols-3">
          <div>
            <p className="label">Persistent storage</p>
            <p
              className={
                storage?.persisted ? 'mt-1 font-medium text-sage-700' : 'mt-1 font-medium text-rose-600'
              }
            >
              {storage?.persisted ? 'Granted' : 'Not granted'}
            </p>
          </div>
          <div>
            <p className="label">Used</p>
            <p className="mt-1 font-medium text-ink-800">{bytesToSize(storage?.usage ?? 0)}</p>
          </div>
          <div>
            <p className="label">Quota</p>
            <p className="mt-1 font-medium text-ink-800">{bytesToSize(storage?.quota ?? 0)}</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
          Clearing browser data deletes the salon database. Keep encrypted backups in Settings →
          Backup &amp; restore.
        </p>
      </SectionCard>

      <div className="flex justify-end">
        <Button leadingIcon={<Save className="h-4 w-4" />} loading={busy} onClick={() => void save()}>
          Save business profile
        </Button>
      </div>
    </div>
  );
}