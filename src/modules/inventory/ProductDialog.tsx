import { useEffect, useState } from 'react';
import type { Paise, Product } from '@/types';
import { saveProduct } from '@/db/repositories/inventoryRepo';
import { useSuppliers } from '@/hooks/useDb';
import { PRODUCT_CATEGORIES, UNITS } from '@/utils/constants';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { Button } from '@/components/common/Button';
import { Field, Input, MoneyInput, Select, Switch } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';

export function ProductDialog({
  open,
  product,
  onClose,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}) {
  const suppliers = useSuppliers();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Hair care');
  const [unit, setUnit] = useState('piece');
  const [supplierId, setSupplierId] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<Paise>(0);
  const [sellingPrice, setSellingPrice] = useState<Paise>(0);
  const [minStock, setMinStock] = useState(5);
  const [openingStock, setOpeningStock] = useState(0);
  const [expiryDate, setExpiryDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? '');
    setSku(product?.sku ?? '');
    setCategory(product?.category ?? 'Hair care');
    setUnit(product?.unit ?? 'piece');
    setSupplierId(product?.supplierId ?? '');
    setPurchasePrice(product?.purchasePrice ?? 0);
    setSellingPrice(product?.sellingPrice ?? 0);
    setMinStock(product?.minStock ?? 5);
    setOpeningStock(0);
    setExpiryDate(product?.expiryDate ?? '');
    setIsActive(product?.isActive ?? true);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  const submit = async () => {
    setError('');
    if (!name.trim()) return setError('Product name is required.');
    if (sellingPrice < 0) return setError('Selling price cannot be negative.');

    setBusy(true);
    try {
      await saveProduct({
        id: product?.id,
        name,
        sku: sku || undefined,
        category,
        unit,
        supplierId: supplierId || undefined,
        purchasePrice,
        sellingPrice,
        minStock,
        openingStock: product ? 0 : openingStock,
        expiryDate: expiryDate || undefined,
        isActive,
      });
      notifySuccess(product ? 'Product updated' : 'Product added', name);
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not save the product.';
      setError(message);
      notifyError('Could not save product', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={product ? 'Edit product' : 'New product'}
      description="Stock changes are tracked in a ledger — quantities are never silently overwritten."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy}>
            {product ? 'Save changes' : 'Add product'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Product name" required>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Argan Hair Serum"
              autoFocus
            />
          </Field>
          <Field label="SKU" hint="Leave blank to generate.">
            <Input value={sku} onChange={(event) => setSku(event.target.value)} placeholder="ARG-100" />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Category">
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              {PRODUCT_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Unit">
            <Select value={unit} onChange={(event) => setUnit(event.target.value)}>
              {UNITS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
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
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Purchase price" required>
            <MoneyInput value={purchasePrice} onChange={setPurchasePrice} />
          </Field>
          <Field label="Selling price" required>
            <MoneyInput value={sellingPrice} onChange={setSellingPrice} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Minimum stock" hint="Triggers low-stock alerts.">
            <Input
              type="number"
              min={0}
              value={minStock}
              onChange={(event) => setMinStock(Math.max(0, Number(event.target.value) || 0))}
            />
          </Field>
          {!product && (
            <Field label="Opening stock" hint="Recorded as a purchase.">
              <Input
                type="number"
                min={0}
                value={openingStock}
                onChange={(event) => setOpeningStock(Math.max(0, Number(event.target.value) || 0))}
              />
            </Field>
          )}
          <Field label="Expiry date">
            <Input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
          </Field>
        </div>

        <div className="rounded-xl border border-ink-200/80 bg-ink-50/60 p-3">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Active product"
            description="Inactive products are hidden from billing but stay in stock history."
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