import { NavLink, useNavigate } from 'react-router-dom';
import { Lock, LogOut, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore, useCurrentUser, useIsOwner, usePermissionSet } from '@/stores/authStore';
import { NAV_GROUPS, type NavItem } from '@/app/navigation';
import { Avatar } from '@/components/common/Badge';

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.exact}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-2.5 rounded-xl px-3 py-[7px] text-[13px] font-medium transition-all duration-150',
          isActive
            ? 'bg-gradient-to-r from-gold-400/15 via-gold-400/5 to-transparent text-gold-200'
            : 'text-ink-300/90 hover:bg-white/[0.05] hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-gold-400" />}
          <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-gold-300' : 'text-ink-400 group-hover:text-ink-200')} />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const user = useCurrentUser();
  const owner = useIsOwner();
  const permissions = usePermissionSet();
  const lock = useAuthStore((state) => state.lock);
  const signOut = useAuthStore((state) => state.signOut);
  const navigate = useNavigate();

  return (
    <div className="relative flex h-full flex-col bg-ink-950">
      <div className="pointer-events-none absolute inset-0 bg-grain opacity-[0.04]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-gold-500/25 to-transparent" />

      <div className="relative flex items-center gap-3 px-5 pb-5 pt-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold-400/40 bg-wine-950 font-display text-[22px] text-gold-300 shadow-inset">
          Z
        </span>
        <div>
          <p className="font-display text-[21px] leading-none tracking-tight text-cream">Zine</p>
          <p className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-ink-400">
            Salon Management
          </p>
        </div>
      </div>

      <nav className="relative nav-scroll flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group, index) => {
          if (group.ownerOnly && !owner) return null;
          if (group.permission && !permissions.has(group.permission)) return null;
          const items = group.items.filter(
            (item) =>
              (!item.ownerOnly || owner) && (!item.permission || permissions.has(item.permission)),
          );
          if (!items.length) return null;
          return (
            <div key={group.label ?? `group-${index}`} className={cn(index > 0 && 'mt-5')}>
              {group.label && (
                <p className="mb-1.5 px-3 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-ink-500">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavRow key={item.to} item={item} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="relative border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] p-2.5">
          <Avatar name={user?.name ?? 'Zine'} size="sm" className="ring-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-cream">{user?.name ?? 'Owner'}</p>
            <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-ink-400">
              {owner && <ShieldCheck className="h-3 w-3 text-gold-400" />}
              {owner ? 'Owner' : 'Employee'}
            </p>
          </div>
          <button
            onClick={() => lock()}
            title="Lock screen"
            aria-label="Lock screen"
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-white/10 hover:text-gold-200"
          >
            <Lock className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              signOut();
              navigate('/login');
            }}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-white/10 hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 px-1 text-[9.5px] uppercase tracking-[0.18em] text-ink-600">
          Zine v1.0 · Offline first
        </p>
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] shadow-[1px_0_0_rgba(255,255,255,0.03)] lg:block">
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="scrim absolute inset-0 animate-fade-in" onClick={onClose} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-[280px] animate-slide-in-right">
            <SidebarContent onNavigate={onClose} />
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="absolute right-3 top-6 rounded-lg p-1.5 text-ink-300 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </aside>
        </div>
      )}
    </>
  );
}
