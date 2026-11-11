import { useEffect, useState } from 'react';
import { ArrowUpFromLine, PackageMinus } from 'lucide-react';
import type { StockMovementType } from '@/types';
import { recordMovement } from '@/db/repositories/inventoryRepo';
import { useProducts } from '@/hooks/useDb';
import { STOCK_MOVEMENT_LABEL } from '@/utils/constants';
import { formatNumber } from '@/utils/money';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Field, Input, Select, Textarea } from '@/components/common/Field';
import { PageHeader } from '@/components/common/PageHeader';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { StockMovementsPanel } from './StockMovementsPanel';

const OUT_TYPES: StockMovementType[] = ['DAMAGE', 'EXPIRY', 'CORRECTION', 'SALE'];

export function StockOutwardPage() {
  const products = useProducts();
  const [productId, setProductId] = useState('');
  const [type, setType] = useState<StockMovementType>('DAMAGE');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const product = products.find((row) => row.id === productId);

  useEffect(() => {
    if (!productId && products.length) setProductId(products[0].id);
  }, [productId, products]);

  const submit = async () => {
    setError('');
    if (!productId) return setError('Choose a product.');
    if (quantity <= 0) return setError('Quantity must be greater than zero.');

    setBusy(true);
    try {
      await recordMovement({
        productId,
        type,
        quantity: type === 'CORRECTION' ? -Math.abs(quantity) : quantity,
        note,
        referenceType: 'MANUAL',
      });
      notifySuccess('Stock adjusted', `${formatNumber(quantity)} ${product?.unit ?? ''} · ${STOCK_MOVEMENT_LABEL[type]}`);
      setQuantity(1);
      setNote('');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not adjust stock.';
      setError(message);
      notifyError('Could not adjust stock', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title="Stock outward"
        description="Record damaged, expired or manually corrected stock. Every change is kept in the ledger."
      />

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-wine-700 text-white">
              <ArrowUpFromLine className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-ink-900">Reduce stock</p>
              <p className="text-[11.5px] text-ink-500">Damage, expiry or correction</p>
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
              <Field label="Reason type" required>
                <Select value={type} onChange={(event) => setType(event.target.value as StockMovementType)}>
                  {OUT_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {STOCK_MOVEMENT_LABEL[value]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Quantity" required hint={product ? `Available ${product.stockCached}` : undefined}>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                />
              </Field>
            </div>

            <Field label="Note" hint="What happened? This is saved in the movement history.">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Bottle leaked during storage"
                rows={3}
              />
            </Field>

            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">
                {error}
              </p>
            )}

            <Button
              block
              variant="wine"
              loading={busy}
              onClick={() => void submit()}
              leadingIcon={<PackageMinus className="h-4 w-4" />}
            >
              Remove {quantity} {product?.unit ?? 'units'}
            </Button>
          </div>
        </Card>

        <StockMovementsPanel
          filter={OUT_TYPES}
          title="Recent stock reductions"
          subtitle="Damaged, expired, manual sales and corrections"
          icon={<ArrowUpFromLine className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}
