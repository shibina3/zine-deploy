import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useBoot } from '@/app/providers/bootContext';
import type { Permission } from '@/types';
import { useAuthStore, useCan, useCurrentUser, useIsOwner } from '@/stores/authStore';
import { LockScreen } from '@/modules/auth/LockScreen';

export function Splash() {
  return (
    <div className="hero-aurora fixed inset-0 flex flex-col items-center justify-center gap-5">
      <div className="pointer-events-none absolute inset-0 bg-grain opacity-[0.05]" />
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-400/40 bg-wine-950 font-display text-3xl text-gold-300">
        Z
      </span>
      <div className="text-center">
        <p className="font-display text-2xl text-cream">Zine</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-ink-400">Opening your salon</p>
      </div>
      <Loader2 className="h-5 w-5 animate-spin text-gold-400" />
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, needsSetup } = useBoot();
  const user = useCurrentUser();
  const locked = useAuthStore((state) => state.locked);
  const location = useLocation();

  if (!ready) return <Splash />;
  if (!user) {
    return (
      <Navigate
        to={needsSetup ? '/setup' : '/login'}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  if (locked) return <LockScreen />;
  return <>{children}</>;
}

export function RequireOwner({ children }: { children: ReactNode }) {
  const owner = useIsOwner();
  if (!owner) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Owners always pass; employees need the configured permission. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const allowed = useCan(permission);
  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
}
