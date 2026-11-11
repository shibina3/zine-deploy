import { Link, useLocation } from 'react-router-dom';
import { CloudOff, Menu, Plus, ShieldCheck, WifiOff } from 'lucide-react';
import { cn } from '@/utils/cn';
import { pageTitle } from '@/app/navigation';
import { useSettings } from '@/hooks/useDb';
import { useOnlineStatus } from '@/hooks/useApp';
import { useCan, useCurrentUser, useIsOwner } from '@/stores/authStore';
import { Avatar } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { formatDate } from '@/utils/date';
import { backupOverdue } from '@/services/backup/backupService';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const settings = useSettings();
  const user = useCurrentUser();
  const owner = useIsOwner();
  const canBill = useCan('billing.write');
  const location = useLocation();
  const online = useOnlineStatus();

  const overdue = settings ? backupOverdue(settings.lastBackupAt, settings.backupReminderHours) : false;

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/60 bg-cream/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          onClick={onMenu}
          aria-label="Open menu"
          className="rounded-xl border border-ink-200 bg-white p-2 text-ink-600 shadow-sm hover:text-ink-900 lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            {settings?.businessName ?? 'Zine'}
          </p>
          <h2 className="truncate font-display text-[17px] leading-tight text-ink-900">
            {pageTitle(location.pathname)}
          </h2>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!online && (
            <span className="hidden items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-medium text-gold-200 sm:inline-flex">
              <WifiOff className="h-3 w-3" /> Offline — still saving locally
            </span>
          )}

          {owner && (
            <Link
              to="/settings/backup"
              title={settings?.lastBackupAt ? 'Backup status' : 'No backup yet'}
              className={cn(
                'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors md:inline-flex',
                overdue
                  ? 'border-gold-300/70 bg-gold-50 text-gold-800 hover:bg-gold-100'
                  : 'border-sage-200 bg-sage-50 text-sage-700 hover:bg-sage-100',
              )}
            >
              {overdue ? <CloudOff className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
              {overdue ? 'Backup due' : 'Backed up'}
            </Link>
          )}

          <span className="hidden text-[12px] text-ink-500 lg:block">
            {formatDate(Date.now(), 'EEE, d MMM yyyy')}
          </span>

          <div className="hidden items-center gap-2 rounded-full border border-ink-200 bg-white/80 py-1 pl-1 pr-3 sm:flex">
            <Avatar name={user?.name ?? 'Zine'} size="xs" />
            <span className="max-w-[120px] truncate text-[12px] font-medium text-ink-700">
              {user?.name ?? 'Owner'}
            </span>
          </div>

          {canBill && (
            <Link to="/billing/new">
              <Button size="sm" variant="gold" leadingIcon={<Plus className="h-4 w-4" />}>
                New bill
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
