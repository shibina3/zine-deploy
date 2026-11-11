import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus } from 'lucide-react';
import type { Product } from '@/types';
import { useProducts, useStockMovements } from '@/hooks/useDb';
import { lowStockProducts, stockValue } from '@/modules/inventory/logic';
import { formatINR } from '@/utils/money';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { DataTable } from '@/components/common/DataTable';
import { SearchInput } from '@/components/common/Field';
import { EmptyState, PageHeader } from '@/components/common/PageHeader';
import { ProductDialog } from './ProductDialog';
import { productColumns } from './ProductTable';

export function InventoryPage() {
  const products = useProducts(true);
  const movements = useStockMovements(1000);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const lowStock = useMemo(() => lowStockProducts(products, movements), [products, movements]);
  const value = useMemo(() => stockValue(products, movements), [products, movements]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term),
    );
  }, [products, query]);

  return (
    <div>
      <PageHeader
        eyebrow="Stock"
        title="Products"
        description="Track purchases, sales, service consumption and corrections through a stock ledger."
        actions={
          <>
            <Link to="/inventory/inward">
              <Button variant="secondary" leadingIcon={<Package className="h-4 w-4" />}>
                Stock inward
              </Button>
            </Link>
            <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              Add product
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">Products</p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-ink-900">
            {products.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Stock value (cost)
          </p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-ink-900">
            {formatINR(value)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">Low stock</p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-rose-600">
            {lowStock.length}
          </p>
        </Card>
      </div>

      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search product, SKU or category…"
          className="w-full sm:w-[320px]"
        />
        <p className="text-[12px] text-ink-500">{filtered.length} products</p>
      </Card>

      <DataTable
        columns={productColumns}
        rows={filtered}
        rowKey={(product) => product.id}
        onRowClick={(product) => setEditing(product)}
        empty={
          <EmptyState
            icon={<Package className="h-5 w-5" />}
            title={query ? 'No matching products' : 'No products yet'}
            description="Add your retail and back-bar products to track stock and consumption."
            action={
              !query ? (
                <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                  Add product
                </Button>
              ) : undefined
            }
          />
        }
      />

      <ProductDialog
        open={creating || Boolean(editing)}
        product={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
