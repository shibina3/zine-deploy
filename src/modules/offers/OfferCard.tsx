import { Pencil, Sparkles } from 'lucide-react';
import type { Offer, Service } from '@/types';
import { setOfferActive } from '@/db/repositories/offerRepo';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { OFFER_TYPE_LABEL } from '@/utils/constants';
import { effectiveOfferPrice, isOfferActive, offerSavings } from '@/modules/offers/logic';
import { formatDate } from '@/utils/date';
import { formatINR } from '@/utils/money';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';

export function OfferCard({
  offer,
  services,
  onEdit,
}: {
  offer: Offer;
  services: Service[];
  onEdit: () => void;
}) {
  const price = effectiveOfferPrice(offer, services);
  const savings = offerSavings(offer, services);
  const active = isOfferActive(offer);

  const validity =
    offer.validFrom || offer.validTo
      ? `${offer.validFrom ? formatDate(offer.validFrom, 'd MMM') : 'Now'} – ${
          offer.validTo ? formatDate(offer.validTo, 'd MMM') : 'ongoing'
        }`
      : 'No expiry set';

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border border-ink-200/70 bg-porcelain p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift',
        !active && 'opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-[16px] font-medium text-ink-900">{offer.name}</p>
          <Badge tone={active ? 'gold' : 'neutral'} className="mt-1.5">
            {OFFER_TYPE_LABEL[offer.type]}
          </Badge>
        </div>
        <p className="shrink-0 font-display text-[18px] font-medium tabular-nums text-ink-900">
          {formatINR(price)}
        </p>
      </div>

      <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-ink-500">
        {offer.description || offer.conditions || `${offer.serviceIds.length} services included`}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-ink-50/70 px-2.5 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-400">Menu price</p>
          <p className="text-[12.5px] font-semibold tabular-nums text-ink-700">
            {formatINR(offer.originalPrice)}
          </p>
        </div>
        <div className="rounded-lg bg-sage-50 px-2.5 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-sage-600">Customer saves</p>
          <p className="text-[12.5px] font-semibold tabular-nums text-sage-700">{formatINR(savings)}</p>
        </div>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-400">
        <Sparkles className="h-3 w-3" /> {validity}
      </p>

      <div className="mt-3 flex items-center gap-1.5 border-t border-ink-100 pt-3">
        <Button
          size="sm"
          variant="ghost"
          leadingIcon={<Pencil className="h-3.5 w-3.5" />}
          onClick={onEdit}
        >
          Edit
        </Button>
        <button
          onClick={async () => {
            try {
              await setOfferActive(offer.id, !offer.isActive);
              notifySuccess(offer.isActive ? 'Offer paused' : 'Offer activated', offer.name);
            } catch (error) {
              notifyError('Could not update offer', error instanceof Error ? error.message : undefined);
            }
          }}
          className={cn(
            'ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors',
            offer.isActive
              ? 'bg-sage-50 text-sage-700 hover:bg-sage-100'
              : 'bg-ink-100 text-ink-500 hover:bg-ink-200',
          )}
        >
          {offer.isActive ? 'Active' : 'Paused'}
        </button>
      </div>
    </div>
  );
}
