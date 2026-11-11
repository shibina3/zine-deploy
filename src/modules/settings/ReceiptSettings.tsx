import { useEffect, useState } from 'react';
import { ReceiptText, Save } from 'lucide-react';
import type { Settings } from '@/types';
import { getSettings, updateSettings } from '@/db/repositories/settingsRepo';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { Button } from '@/components/common/Button';
import { Card, SectionCard } from '@/components/common/Card';
import { Field, Input, Select, Switch, Textarea } from '@/components/common/Field';
import { ReceiptPreview } from './ReceiptPreview';

export function ReceiptSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [prefix, setPrefix] = useState('ZN');
  const [footer, setFooter] = useState('Thank you for visiting Zine!');
  const [width, setWidth] = useState<Settings['receiptWidth']>('80');
  const [showTax, setShowTax] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const row = await getSettings();
      setSettings(row);
      setPrefix(row.receiptPrefix);
      setFooter(row.receiptFooter);
      setWidth(row.receiptWidth);
      setShowTax(row.showTaxOnReceipt);
    })();
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      await updateSettings({
        receiptPrefix: prefix.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'ZN',
        receiptFooter: footer,
        receiptWidth: width,
        showTaxOnReceipt: showTax,
      });
      notifySuccess('Receipt settings saved', 'New bills will use these settings.');
    } catch (error) {
      notifyError('Could not save', error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <SectionCard
          title="Receipt layout"
          subtitle="Bill numbers, footer and printer width"
          icon={<ReceiptText className="h-4 w-4" />}
        >
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Bill number prefix" hint="Example: ZN → ZN-2026-00001">
                <Input
                  value={prefix}
                  onChange={(event) =>
                    setPrefix(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                  }
                  maxLength={6}
                />
              </Field>
              <Field label="Printer width">
                <Select
                  value={width}
                  onChange={(event) => setWidth(event.target.value as Settings['receiptWidth'])}
                >
                  <option value="58">58 mm thermal</option>
                  <option value="80">80 mm thermal</option>
                  <option value="A4">A4 PDF</option>
                </Select>
              </Field>
            </div>

            <Field label="Receipt footer" hint="Shown at the bottom of every receipt.">
              <Textarea value={footer} onChange={(event) => setFooter(event.target.value)} rows={2} />
            </Field>

            <div className="rounded-xl border border-ink-200/80 bg-ink-50/60 p-3">
              <Switch
                checked={showTax}
                onChange={setShowTax}
                label="Show tax line on receipts"
                description="Only appears when a bill has tax applied."
              />
            </div>

            <div className="flex justify-end">
              <Button
                leadingIcon={<Save className="h-4 w-4" />}
                loading={busy}
                onClick={() => void save()}
              >
                Save receipt settings
              </Button>
            </div>
          </div>
        </SectionCard>

        <Card className="p-4 text-[11.5px] leading-relaxed text-ink-500">
          Printer behaviour differs between browsers and devices. Test 58mm and 80mm receipts on the
          actual salon printer before handover. PDFs render “Rs.” because standard PDF fonts cannot
          show ₹.
        </Card>
      </div>

      <ReceiptPreview
        businessName={settings?.businessName ?? 'Zine Beauty Parlour'}
        tagline={settings?.tagline ?? ''}
        prefix={prefix}
        footer={footer}
        showTax={showTax}
      />
    </div>
  );
}
