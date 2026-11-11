import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Building2, CloudUpload, ReceiptText, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';
import { PageHeader } from '@/components/common/PageHeader';

const TABS = [
  { to: '/settings', label: 'Business', icon: Building2, exact: true },
  { to: '/settings/receipt', label: 'Receipt', icon: ReceiptText },
  { to: '/settings/backup', label: 'Backup & restore', icon: CloudUpload },
  { to: '/settings/security', label: 'Security & audit', icon: ShieldCheck },
];

export function SettingsPage() {
  const location = useLocation();
  const active = TABS.find((tab) => tab.to === location.pathname) ?? TABS[0];

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Business details, receipt design, encrypted backups and access control."
      />

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-ink-200/70 bg-porcelain p-1.5 shadow-card lg:h-fit lg:flex-col">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.exact}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors',
                    isActive
                      ? 'bg-ink-900 text-cream'
                      : 'text-ink-600 hover:bg-ink-100/70 hover:text-ink-900',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="min-w-0">
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold-700 lg:hidden">
            {active.label}
          </p>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
