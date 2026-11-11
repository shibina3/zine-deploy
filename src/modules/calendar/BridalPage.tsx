import { useMemo, useState } from 'react';
import { Heart, Plus } from 'lucide-react';
import type { BridalBooking } from '@/types';
import { useBridalBookings } from '@/hooks/useDb';
import { todayISO } from '@/utils/date';
import { formatINR, sumPaise } from '@/utils/money';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState, PageHeader } from '@/components/common/PageHeader';
import { BridalCard } from './BridalCard';
import { BridalDialog } from './BridalDialog';

export function BridalPage() {
  const bookings = useBridalBookings();
  const [editing, setEditing] = useState<BridalBooking | null>(null);
  const [creating, setCreating] = useState(false);
  const today = todayISO();

  const stats = useMemo(() => {
    const active = bookings.filter((booking) => booking.status !== 'CANCELLED');
    return {
      upcoming: active.filter((booking) => booking.eventDate >= today).length,
      value: sumPaise(active.map((booking) => booking.packagePrice)),
      advance: sumPaise(active.map((booking) => booking.advance)),
      balance: sumPaise(active.map((booking) => Math.max(0, booking.packagePrice - booking.advance))),
    };
  }, [bookings, today]);

  const ordered = useMemo(
    () =>
      [...bookings].sort((a, b) => {
        const upcomingA = a.eventDate >= today ? 0 : 1;
        const upcomingB = b.eventDate >= today ? 0 : 1;
        return upcomingA - upcomingB || a.eventDate.localeCompare(b.eventDate);
      }),
    [bookings, today],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Celebrations"
        title="Bridal bookings"
        description="Long events with advances, trials and blocked salon time — always visible on the calendar."
        actions={
          <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            New bridal booking
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Upcoming events" value={String(stats.upcoming)} />
        <Metric label="Total package value" value={formatINR(stats.value)} />
        <Metric label="Advances collected" value={formatINR(stats.advance)} />
        <Metric label="Balance due" value={formatINR(stats.balance)} tone="wine" />
      </div>

      {ordered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Heart className="h-5 w-5" />}
            title="No bridal bookings yet"
            description="Add a bridal package, collect an advance and block the salon for the event day."
            action={
              <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                Create bridal booking
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {ordered.map((booking) => (
            <BridalCard key={booking.id} booking={booking} onEdit={() => setEditing(booking)} />
          ))}
        </div>
      )}

      <BridalDialog
        open={creating || Boolean(editing)}
        booking={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'wine' }) {
  return (
    <Card className="p-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <p
        className={
          tone === 'wine'
            ? 'mt-2 font-display text-[22px] font-medium tabular-nums text-wine-700'
            : 'mt-2 font-display text-[22px] font-medium tabular-nums text-ink-900'
        }
      >
        {value}
      </p>
    </Card>
  );
}
