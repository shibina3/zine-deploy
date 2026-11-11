import { useMemo, useState } from 'react';
import { BadgePercent, Plus } from 'lucide-react';
import type { Offer } from '@/types';
import { useOffers, useServices } from '@/hooks/useDb';
import { isOfferActive } from '@/modules/offers/logic';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState, PageHeader } from '@/components/common/PageHeader';
import { OfferCard } from './OfferCard';
import { OfferDialog } from './OfferDialog';

export function OffersPage() {
  const offers = useOffers();
  const services = useServices();
  const [editing, setEditing] = useState<Offer | null>(null);
  const [creating, setCreating] = useState(false);

  const activeCount = useMemo(
    () => offers.filter((offer) => isOfferActive(offer)).length,
    [offers],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Promotions"
        title="Offers & combos"
        description="Create packages once and apply them in one click at the counter. Old bills keep their original prices."
        actions={
          <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            New offer
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="gold">{activeCount} active</Badge>
        <Badge tone="neutral">{offers.length} total</Badge>
      </div>

      {offers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BadgePercent className="h-5 w-5" />}
            title="No offers yet"
            description="Bundle services into a combo or run a limited-period discount to increase average bill value."
            action={
              <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                Create offer
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              services={services}
              onEdit={() => setEditing(offer)}
            />
          ))}
        </div>
      )}

      <OfferDialog
        open={creating || Boolean(editing)}
        offer={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
