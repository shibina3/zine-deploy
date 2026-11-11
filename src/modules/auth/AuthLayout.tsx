import type { ReactNode } from 'react';
import { CalendarDays, ReceiptText, ShieldCheck } from 'lucide-react';

const FEATURES = [
  {
    icon: ReceiptText,
    title: 'Every service billed',
    body: 'Unique bill numbers, split payments and receipts in seconds.',
  },
  {
    icon: CalendarDays,
    title: 'Appointments that never clash',
    body: 'Salon blocks, employee leave and bridal bookings in one calendar.',
  },
  {
    icon: ShieldCheck,
    title: 'Your data stays with you',
    body: 'Works offline on this device, with encrypted backups you control.',
  },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="hero-aurora relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-grain opacity-[0.05]" />
        <div className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full border border-gold-400/20" />
        <div className="pointer-events-none absolute -right-10 top-1/3 h-52 w-52 rounded-full border border-gold-400/15" />

        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold-400/40 bg-wine-950 font-display text-2xl text-gold-300">
            Z
          </span>
          <div>
            <p className="font-display text-2xl leading-none text-cream">Zine</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-400">
              Beauty Parlour
            </p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-300">
            Salon management, simplified
          </p>
          <h1 className="font-display text-[42px] font-light leading-[1.08] tracking-tight text-cream">
            Run the salon,
            <br />
            not the paperwork.
          </h1>
          <p className="mt-5 max-w-md text-[14.5px] leading-relaxed text-ink-300">
            Billing, appointments, bridal bookings, stock and salaries — all in one calm,
            offline-first workspace built for the salon counter.
          </p>

          <div className="mt-10 space-y-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-gold-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[13.5px] font-medium text-cream">{feature.title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-400">{feature.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative flex items-center gap-3 text-[11px] text-ink-500">
          <span className="h-px flex-1 bg-white/10" />
          <span className="uppercase tracking-[0.2em]">Zine v1.0 · One primary device</span>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[430px] animate-fade-up">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold-400/40 bg-wine-950 font-display text-xl text-gold-300">
              Z
            </span>
            <div>
              <p className="font-display text-xl leading-none text-ink-900">Zine</p>
              <p className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-ink-400">
                Salon Management
              </p>
            </div>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
