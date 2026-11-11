import { useEffect, useState } from 'react';
import { ArrowDownToLine, Package } from 'lucide-react';
import type { Paise } from '@/types';
import { recordPurchase } from '@/db/repositories/inventoryRepo';
import { useProducts, useSuppliers } from '@/hooks/useDb';
import { todayISO } from '@/utils/date';
import { formatNumber } from '@/utils/money';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Field, Input, MoneyInput, Select, Textarea } from '@/components/common/Field';
import { PageHeader } from '@/components/common/PageHeader';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { StockMovementsPanel } from './StockMovementsPanel';

export function StockInwardPage() {
  const products = useProducts();
  const suppliers = useSuppliers();

  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState<Paise>(0);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const product = products.find((row) => row.id === productId);

  useEffect(() => {
    if (!productId && products.length) setProductId(products[0].id);
  }, [productId, products]);

  useEffect(() => {
    if (product) setUnitCost(product.purchasePrice);
  }, [product]);

  const submit = async () => {
    setError('');
    if (!productId) return setError('Choose a product.');
    if (quantity <= 0) return setError('Quantity must be greater than zero.');

    setBusy(true);
    try {
      await recordPurchase({
        productId,
        quantity,
        unitCost,
        supplierId: supplierId || undefined,
        invoiceRef,
        note,
        occurredAt: new Date(`${date}T12:00:00`).getTime(),
      });
      notifySuccess('Stock added', `${formatNumber(quantity)} ${product?.unit ?? ''} of ${product?.name}`);
      setQuantity(1);
      setInvoiceRef('');
      setNote('');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not record stock.';
      setError(message);
      notifyError('Could not record stock', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title="Stock inward"
        description="Record purchases and new stock. Every entry is added to the product’s movement ledger."
      />

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-600 text-white">
              <ArrowDownToLine className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-ink-900">New stock entry</p>
              <p className="text-[11.5px] text-ink-500">Purchase or opening stock</p>
            </div>
          </div>

          <div className="space-y-3">
            <Field label="Product" required>
              <Select value={productId} onChange={(event) => setProductId(event.target.value)}>
                <option value="">Select product…</option>
                {products.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} · stock {row.stockCached} {row.unit}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity" required>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                />
              </Field>
              <Field label="Unit cost" required>
                <MoneyInput value={unitCost} onChange={setUnitCost} />
              </Field>
            </div>

            <Field label="Supplier">
              <Select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                <option value="">None</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </Field>
              <Field label="Invoice ref">
                <Input
                  value={invoiceRef}
                  onChange={(event) => setInvoiceRef(event.target.value)}
                  placeholder="INV-2041"
                />
              </Field>
            </div>

            <Field label="Note">
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} />
            </Field>

            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">
                {error}
              </p>
            )}

            <Button block loading={busy} onClick={() => void submit()} leadingIcon={<Package className="h-4 w-4" />}>
              Add {quantity} {product?.unit ?? 'units'}
            </Button>
          </div>
        </Card>

        <StockMovementsPanel filter="PURCHASE" title="Recent stock entries" subtitle="Latest purchases across all products" />
      </div>
    </div>
  );
}
