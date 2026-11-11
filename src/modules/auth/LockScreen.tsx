import { useState, type FormEvent } from 'react';
import { LockKeyhole, LogOut } from 'lucide-react';
import { Avatar } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { useSettings } from '@/hooks/useDb';

/** Shown when the app has been idle past the configured lock timeout. */
export function LockScreen() {
  const user = useCurrentUser();
  const settings = useSettings();
  const unlock = useAuthStore((state) => state.unlock);
  const signOut = useAuthStore((state) => state.signOut);

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await unlock(password);
      if (!result.ok) setError(result.error ?? 'Incorrect password.');
      else setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hero-aurora fixed inset-0 z-[130] flex items-center justify-center px-5">
      <div className="pointer-events-none absolute inset-0 bg-grain opacity-[0.05]" />
      <div className="relative w-full max-w-[380px] animate-scale-in">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-gold-400/40 bg-wine-950 font-display text-2xl text-gold-300">
            Z
          </span>
          <p className="font-display text-2xl leading-none text-cream">{settings?.businessName ?? 'Zine'}</p>
          <p className="mt-1.5 text-[11px] uppercase tracking-[0.2em] text-ink-400">Workspace locked</p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-3xl border border-white/10 bg-porcelain/95 p-6 shadow-lift backdrop-blur"
        >
          <div className="mb-5 flex items-center gap-3">
            <Avatar name={user?.name ?? 'Zine'} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">{user?.name ?? 'Owner'}</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink-400">
                {user?.role === 'OWNER' ? 'Owner' : 'Employee'}
              </p>
            </div>
            <LockKeyhole className="ml-auto h-4 w-4 text-ink-300" />
          </div>

          <label htmlFor="unlock-password" className="label mb-1.5 block">
            Password
          </label>
          <Input
            id="unlock-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
            autoComplete="current-password"
            placeholder="Enter your password"
          />

          {error && <p className="mt-2 text-[12px] font-medium text-rose-600">{error}</p>}

          <Button type="submit" block className="mt-4" loading={busy}>
            Unlock
          </Button>

          <button
            type="button"
            onClick={signOut}
            className="mt-4 flex w-full items-center justify-center gap-1.5 text-[12px] font-medium text-ink-500 hover:text-ink-800"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out instead
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-ink-500">
          The app locks automatically when left idle.
        </p>
      </div>
    </div>
  );
}
