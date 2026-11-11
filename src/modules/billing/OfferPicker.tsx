import { BadgePercent } from 'lucide-react';
import type { Offer, Service } from '@/types';
import { effectiveOfferPrice, menuPriceFor, offerSavings } from '@/modules/offers/logic';
import { formatINR } from '@/utils/money';

export function OfferPicker({
  offers,
  services,
  onAdd,
  disabled,
}: {
  offers: Offer[];
  services: Service[];
  onAdd: (offer: Offer) => void;
  disabled?: boolean;
}) {
  if (offers.length === 0) {
    return <p className="px-3 py-10 text-center text-[12.5px] text-ink-400">No active offers right now.</p>;
  }

  return (
    <ul className="space-y-2 p-1">
      {offers.map((offer) => {
        const menu = menuPriceFor(offer, services);
        const price = effectiveOfferPrice(offer, services);
        const savings = offerSavings(offer, services);
        return (
          <li key={offer.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAdd(offer)}
              className="w-full rounded-xl border border-gold-200/70 bg-gold-50/40 p-3 text-left transition-colors hover:border-gold-300 hover:bg-gold-50 disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-900">
                    <BadgePercent className="h-3.5 w-3.5 shrink-0 text-gold-600" /> {offer.name}
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] text-ink-500">
                    {offer.description || offer.conditions || 'Combo offer'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold tabular-nums text-ink-900">{formatINR(price)}</p>
                  {menu > price && (
                    <p className="text-[11px] tabular-nums text-ink-400 line-through">{formatINR(menu)}</p>
                  )}
                </div>
              </div>
              {savings > 0 && (
                <p className="mt-1.5 inline-flex rounded-full bg-sage-100 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-sage-700">
                  Saves {formatINR(savings)}
                </p>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
