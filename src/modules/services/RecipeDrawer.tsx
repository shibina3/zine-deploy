import { useEffect, useState } from 'react';
import { FlaskConical, Plus, Trash2 } from 'lucide-react';
import type { Service } from '@/types';
import { useProducts, useServiceRecipes } from '@/hooks/useDb';
import { deleteRecipe, saveRecipe } from '@/db/repositories/serviceRepo';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { Button, IconButton } from '@/components/common/Button';
import { Field, Input, Select } from '@/components/common/Field';
import { Drawer } from '@/components/common/Modal';

/**
 * Optional product consumption for a service. When configured, completing a bill
 * deducts these quantities from the stock ledger automatically.
 */
export function RecipeDrawer({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const products = useProducts();
  const recipes = useServiceRecipes(service?.id);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!service) return;
    setProductId(products[0]?.id ?? '');
    setQuantity('10');
  }, [service, products]);

  const selectedProduct = products.find((product) => product.id === productId);

  const add = async () => {
    if (!service || !selectedProduct) return;
    setBusy(true);
    try {
      await saveRecipe({
        serviceId: service.id,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: Number(quantity) || 0,
        unit: selectedProduct.unit,
      });
      notifySuccess('Recipe updated', `${selectedProduct.name} linked to ${service.name}`);
      setQuantity('10');
    } catch (error) {
      notifyError('Could not save recipe', error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={Boolean(service)}
      onClose={onClose}
      title={service ? `Recipe · ${service.name}` : 'Recipe'}
      subtitle="Optional product consumption used when this service is billed"
    >
      {service && (
        <div className="space-y-5">
          <div className="rounded-xl border border-gold-200/70 bg-gold-50/60 p-3 text-[12px] leading-relaxed text-gold-900">
            Configure this only if you know how much product a service uses. Zine deducts these
            quantities from stock when the bill is created, and returns them if the bill is cancelled.
          </div>

          {recipes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-200 px-3 py-6 text-center text-[12.5px] text-ink-400">
              No products linked yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {recipes.map((recipe) => (
                <li
                  key={recipe.id}
                  className="flex items-center gap-2 rounded-xl border border-ink-200/70 bg-white/70 px-3 py-2"
                >
                  <FlaskConical className="h-4 w-4 text-gold-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-ink-800">{recipe.productName}</p>
                    <p className="text-[11px] text-ink-500">
                      {recipe.quantity} {recipe.unit} per service
                    </p>
                  </div>
                  <IconButton
                    label="Remove"
                    variant="dangerGhost"
                    onClick={async () => {
                      await deleteRecipe(recipe.id);
                      notifySuccess('Recipe removed', recipe.productName);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-2xl border border-ink-200/80 p-4">
            <p className="label mb-3">Add product</p>
            <div className="space-y-3">
              <Field label="Product">
                <Select value={productId} onChange={(event) => setProductId(event.target.value)}>
                  <option value="">Select a product…</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.unit})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={`Quantity per service${selectedProduct ? ` (${selectedProduct.unit})` : ''}`}>
                <Input value={quantity} onChange={(event) => setQuantity(event.target.value.replace(/[^\d.]/g, ''))} />
              </Field>
              <Button
                block
                variant="secondary"
                leadingIcon={<Plus className="h-4 w-4" />}
                disabled={!selectedProduct}
                loading={busy}
                onClick={() => void add()}
              >
                Add to recipe
              </Button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
