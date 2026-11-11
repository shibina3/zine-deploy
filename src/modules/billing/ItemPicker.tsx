import { useMemo, useState } from 'react';
import { Plus, Search, Sparkles } from 'lucide-react';
import type { Offer, Product, Service } from '@/types';
import { formatDuration } from '@/utils/date';
import { formatINR } from '@/utils/money';
import { isOfferActive } from '@/modules/offers/logic';
import { Tabs } from '@/components/common/Tabs';
import { Input } from '@/components/common/Field';
import { OfferPicker } from './OfferPicker';
import { ProductPickerList } from './ProductPickerList';

type Tab = 'SERVICES' | 'PRODUCTS' | 'OFFERS';

export function ItemPicker({
  services,
  products,
  offers,
  onAddService,
  onAddProduct,
  onAddOffer,
  disabled,
}: {
  services: Service[];
  products: Product[];
  offers: Offer[];
  onAddService: (service: Service) => void;
  onAddProduct: (product: Product) => void;
  onAddOffer: (offer: Offer) => void;
  disabled?: boolean;
}) {
  const [tab, setTab] = useState<Tab>('SERVICES');
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();

  const visibleServices = useMemo(
    () =>
      services.filter(
        (service) =>
          !term ||
          service.name.toLowerCase().includes(term) ||
          service.category.toLowerCase().includes(term),
      ),
    [services, term],
  );
  const visibleProducts = useMemo(
    () => products.filter((product) => !term || product.name.toLowerCase().includes(term)),
    [products, term],
  );
  const activeOffers = useMemo(() => offers.filter((offer) => isOfferActive(offer)), [offers]);

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-porcelain shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-3 py-2.5">
        <Tabs
          value={tab}
          onChange={(next) => {
            setTab(next);
            setQuery('');
          }}
          items={[
            { value: 'SERVICES', label: 'Services', count: services.length },
            { value: 'PRODUCTS', label: 'Products', count: products.length },
            { value: 'OFFERS', label: 'Offers', count: activeOffers.length },
          ]}
        />
        <div className="relative w-full sm:w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${tab.toLowerCase()}…`}
            className="h-9 pl-8 text-[12.5px]"
          />
        </div>
      </div>

      <div className="max-h-[340px] overflow-y-auto p-2">
        {tab === 'SERVICES' &&
          (visibleServices.length === 0 ? (
            <p className="px-3 py-10 text-center text-[12.5px] text-ink-400">
              No services match your search.
            </p>
          ) : (
            <ul className="space-y-1">
              {visibleServices.map((service) => (
                <li key={service.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onAddService(service)}
                    className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-gold-50/60 disabled:opacity-50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-wine-50 text-wine-600">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink-900">
                        {service.name}
                      </span>
                      <span className="block text-[11px] text-ink-500">
                        {service.category} · {formatDuration(service.durationMinutes)}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-800">
                      {formatINR(service.price)}
                    </span>
                    <Plus className="h-4 w-4 shrink-0 text-ink-300 group-hover:text-gold-600" />
                  </button>
                </li>
              ))}
            </ul>
          ))}

        {tab === 'PRODUCTS' && (
          <ProductPickerList products={visibleProducts} onAdd={onAddProduct} disabled={disabled} />
        )}

        {tab === 'OFFERS' && (
          <OfferPicker offers={activeOffers} services={services} onAdd={onAddOffer} disabled={disabled} />
        )}
      </div>
    </div>
  );
}
