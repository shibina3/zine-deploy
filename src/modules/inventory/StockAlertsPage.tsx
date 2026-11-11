import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, PackageCheck, RefreshCw } from 'lucide-react';
import { useProducts, useStockMovements } from '@/hooks/useDb';
import { lowStockProducts, reconcileStock } from '@/modules/inventory/logic';
import { reconcileProductStock } from '@/db/repositories/inventoryRepo';
import { addDaysISO, formatDate, todayISO } from '@/utils/date';
import { formatNumber } from '@/utils/money';
import { cn } from '@/utils/cn';
import { Button } from '@/components/common/Button';
import { Card, SectionCard } from '@/components/common/Card';
import { EmptyState, PageHeader } from '@/components/common/PageHeader';
import { notifyError, notifySuccess } from '@/components/common/toastStore';

export function StockAlertsPage() {
  const products = useProducts();
  const movements = useStockMovements(1200);
  const [busy, setBusy] = useState(false);

  const lowStock = useMemo(() => lowStockProducts(products, movements), [products, movements]);
  const mismatches = useMemo(() => reconcileStock(products, movements), [products, movements]);
  const soon = addDaysISO(todayISO(), 30);
  const expiring = products
    .filter((product) => product.expiryDate && product.expiryDate <= soon)
    .sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? ''));

  const reconcileAll = async () => {
    setBusy(true);
    try {
      for (const mismatch of mismatches) {
        await reconcileProductStock(mismatch.product.id);
      }
      notifySuccess('Stock reconciled', `${mismatches.length} product(s) updated from the ledger.`);
    } catch (error) {
      notifyError('Reconciliation failed', error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title="Stock alerts"
        description="Products at or below their minimum level, expiring batches and ledger integrity."
        actions={
          <Link to="/inventory/inward">
            <Button leadingIcon={<PackageCheck className="h-4 w-4" />}>Restock</Button>
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Low stock"
          subtitle={`${lowStock.length} product(s) need attention`}
          icon={<AlertTriangle className="h-4 w-4" />}
        >
          {lowStock.length === 0 ? (
            <EmptyState
              compact
              title="All stock levels are healthy"
              description="Nothing is at or below its minimum."
            />
          ) : (
            <ul className="space-y-3">
              {lowStock.map((level) => {
                const ratio = level.product.minStock
                  ? Math.min(100, Math.round((level.stock / level.product.minStock) * 100))
                  : 0;
                return (
                  <li key={level.product.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-ink-800">
                          {level.product.name}
                        </p>
                        <p className="text-[11px] text-ink-500">
                          {level.product.category} · {level.product.sku}
                        </p>
                      </div>
                      <p className="shrink-0 text-[12px] font-semibold tabular-nums text-ink-800">
                        {formatNumber(level.stock)} / {formatNumber(level.product.minStock)}{' '}
                        {level.product.unit}
                      </p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className={cn('h-full rounded-full', ratio < 40 ? 'bg-rose-500' : 'bg-gold-400')}
                        style={{ width: `${Math.max(6, ratio)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard
            title="Expiring soon"
            subtitle="Within the next 30 days"
            icon={<AlertTriangle className="h-4 w-4" />}
          >
            {expiring.length === 0 ? (
              <EmptyState
                compact
                title="No expiring products"
                description="No batches expire in the next 30 days."
              />
            ) : (
              <ul className="space-y-2">
                {expiring.map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="truncate font-medium text-ink-800">{product.name}</span>
                    <span className="shrink-0 rounded-full bg-gold-100 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-gold-800">
                      {product.expiryDate ? formatDate(product.expiryDate, 'd MMM yyyy') : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-gold-300">
                <RefreshCw className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink-900">Ledger integrity</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">
                  {mismatches.length === 0
                    ? 'Cached stock matches the movement ledger.'
                    : `${mismatches.length} product(s) have cached stock that differs from the ledger.`}
                </p>
                {mismatches.length > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2.5"
                    loading={busy}
                    onClick={() => void reconcileAll()}
                  >
                    Rebuild from ledger
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
