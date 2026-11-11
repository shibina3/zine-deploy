import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ALL_PERMISSIONS, type Permission, type Role, type User } from '@/types';
import { db } from '@/db/database';
import { confirmPassword } from '@/services/auth/authService';
import { setActor } from '@/services/actor';

/**
 * Session state. Only the minimum identity is persisted; credentials never are.
 * Repositories read the actor from `services/actor` (kept in sync below).
 */

interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  employeeId?: string;
  permissions: Permission[];
}

interface AuthState {
  user: SessionUser | null;
  locked: boolean;
  lastActivity: number;
  signIn: (user: User) => void;
  signOut: () => void;
  lock: () => void;
  unlock: (password: string) => Promise<{ ok: boolean; error?: string }>;
  touch: () => void;
  refresh: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      locked: false,
      lastActivity: Date.now(),

      signIn: (user) => {
        const session: SessionUser = {
          id: user.id,
          name: user.displayName,
          username: user.username,
          role: user.role,
          employeeId: user.employeeId,
          permissions: user.permissions,
        };
        setActor({ id: session.id, name: session.name, role: session.role, employeeId: session.employeeId });
        set({ user: session, locked: false, lastActivity: Date.now() });
      },

      signOut: () => {
        setActor(null);
        set({ user: null, locked: false });
      },

      lock: () => {
        if (get().user) set({ locked: true });
      },

      unlock: async (password) => {
        const user = get().user;
        if (!user) return { ok: false, error: 'No active session.' };
        const valid = await confirmPassword(user.id, password);
        if (!valid) return { ok: false, error: 'Incorrect password.' };
        set({ locked: false, lastActivity: Date.now() });
        return { ok: true };
      },

      touch: () => set({ lastActivity: Date.now() }),

      refresh: (user) => {
        if (!user || !user.isActive) {
          setActor(null);
          set({ user: null, locked: false });
          return;
        }
        const session: SessionUser = {
          id: user.id,
          name: user.displayName,
          username: user.username,
          role: user.role,
          employeeId: user.employeeId,
          permissions: user.permissions,
        };
        setActor({ id: session.id, name: session.name, role: session.role, employeeId: session.employeeId });
        set({ user: session });
      },
    }),
    {
      name: 'zine-session',
      partialize: (state) => ({
        user: state.user,
        locked: state.locked,
        lastActivity: state.lastActivity,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          setActor({
            id: state.user.id,
            name: state.user.name,
            role: state.user.role,
            employeeId: state.user.employeeId,
          });
        }
      },
    },
  ),
);

export function useCurrentUser() {
  return useAuthStore((state) => state.user);
}

export function useIsOwner() {
  return useAuthStore((state) => state.user?.role === 'OWNER');
}

export function useCan(permission: Permission): boolean {
  return useAuthStore(
    (state) => state.user?.role === 'OWNER' || Boolean(state.user?.permissions.includes(permission)),
  );
}

/** All permissions for the current user. Owners implicitly have every permission. */
export function usePermissionSet(): Set<Permission> {
  const user = useAuthStore((state) => state.user);
  return useMemo(
    () =>
      new Set<Permission>(
        user?.role === 'OWNER' ? ALL_PERMISSIONS : (user?.permissions ?? []),
      ),
    [user],
  );
}

/** Re-validates the persisted session against the database on app boot. */
export async function hydrateSession(): Promise<'anon' | 'authed' | 'invalid'> {
  const session = useAuthStore.getState().user;
  if (!session) return 'anon';
  const record = await db.users.get(session.id);
  if (!record || !record.isActive) {
    useAuthStore.getState().signOut();
    return 'invalid';
  }
  useAuthStore.getState().refresh(record);
  return 'authed';
}
