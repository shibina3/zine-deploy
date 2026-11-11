import { Link } from 'react-router-dom';
import { CalendarDays, Plus, ReceiptText, TrendingUp, Users, Wallet } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/date';
import { formatINR } from '@/utils/money';
import { Button } from '@/components/common/Button';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HeroPanel({
  userName,
  owner,
  today,
  periodLabel,
  collections,
  sales,
  outstanding,
  billCount,
  pendingBills,
  appointmentCount,
  onLeaveCount,
  trend,
}: {
  userName: string;
  owner: boolean;
  today: string;
  periodLabel: string;
  collections: number;
  sales: number;
  outstanding: number;
  billCount: number;
  pendingBills: number;
  appointmentCount: number;
  onLeaveCount: number;
  trend: number | null;
}) {
  return (
    <section className="hero-aurora relative overflow-hidden rounded-3xl p-6 text-cream shadow-lift sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-grain opacity-[0.05]" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-gold-400/20" />
      <div className="pointer-events-none absolute -right-6 top-1/3 h-40 w-40 rounded-full border border-gold-400/10" />

      <div className="relative grid gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-gold-300">
            {formatDate(today, 'EEEE, d MMMM yyyy')}
          </p>
          <h1 className="mt-2 font-display text-[32px] font-light leading-tight tracking-tight text-cream sm:text-[38px]">
            {greeting()}, {userName.split(' ')[0] || 'there'}.
          </h1>
          <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-ink-300">
            {owner
              ? 'Here is how the salon is doing today — every bill, payment and appointment in one place.'
              : 'Here is your day at the salon. Record every service you complete so nothing is missed.'}
          </p>

          {owner && (
            <div className="mt-7">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-400">
                Collected · {periodLabel}
              </p>
              <div className="mt-1 flex flex-wrap items-end gap-3">
                <span className="font-display text-[44px] font-light leading-none tracking-tight text-cream tabular-nums">
                  {formatINR(collections)}
                </span>
                {typeof trend === 'number' && (
                  <span
                    className={cn(
                      'mb-1.5 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold',
                      trend >= 0 ? 'bg-sage-500/15 text-sage-200' : 'bg-rose-500/15 text-rose-200',
                    )}
                  >
                    <TrendingUp className="h-3 w-3" />
                    {Math.abs(trend)}% vs yesterday
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[12px] text-ink-400">
                {formatINR(sales)} billed in this period · {formatINR(outstanding)} pending across the salon
              </p>
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Link to="/billing/new">
              <Button variant="gold" leadingIcon={<Plus className="h-4 w-4" />}>
                New bill
              </Button>
            </Link>
            <Link to="/calendar">
              <Button
                variant="secondary"
                className="border-white/15 bg-white/[0.06] text-cream hover:border-white/25 hover:bg-white/[0.1]"
                leadingIcon={<CalendarDays className="h-4 w-4" />}
              >
                Today’s calendar
              </Button>
            </Link>
            {owner && (
              <Link to="/customers">
                <Button
                  variant="ghost"
                  className="text-ink-300 hover:bg-white/10 hover:text-cream"
                  leadingIcon={<Users className="h-4 w-4" />}
                >
                  Customers
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 self-start">
          <HeroStat label="Bills" value={String(billCount)} icon={<ReceiptText className="h-4 w-4" />} />
          <HeroStat label="Pending bills" value={String(pendingBills)} icon={<Wallet className="h-4 w-4" />} />
          <HeroStat label="Appointments today" value={String(appointmentCount)} icon={<CalendarDays className="h-4 w-4" />} />
          <HeroStat label="On leave today" value={String(onLeaveCount)} icon={<Users className="h-4 w-4" />} />
        </div>
      </div>
    </section>
  );
}

function HeroStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3.5 backdrop-blur-sm">
      <div className="flex items-center justify-between text-ink-300">
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em]">{label}</span>
        <span className="text-gold-300">{icon}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-light leading-none text-cream tabular-nums">{value}</p>
    </div>
  );
}
