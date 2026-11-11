import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, LogIn, UserRound } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button } from '@/components/common/Button';
import { Field, Input } from '@/components/common/Field';
import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { useBoot } from '@/app/providers/bootContext';
import { login } from '@/services/auth/authService';

export function LoginPage() {
  const { needsSetup } = useBoot();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useCurrentUser();
  const signIn = useAuthStore((state) => state.signIn);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;
  if (needsSetup) return <Navigate to="/setup" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setBusy(true);
    try {
      const result = await login(username, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      signIn(result.user);
      const target = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(target, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-7">
        <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold-700">
          Zine Beauty Parlour
        </p>
        <h1 className="font-display text-[30px] font-medium leading-tight tracking-tight text-ink-900">
          Welcome back
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">
          Sign in to open today’s appointments, bills and collections.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4" autoComplete="on">
        <Field label="Username" required htmlFor="login-username">
          <Input
            id="login-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            leading={<UserRound className="h-4 w-4" />}
            autoComplete="username"
            autoFocus
            placeholder="owner"
          />
        </Field>

        <Field label="Password" required htmlFor="login-password">
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            leading={<KeyRound className="h-4 w-4" />}
            autoComplete="current-password"
            placeholder="••••••••"
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
        </Field>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-medium text-rose-700"
          >
            {error}
          </div>
        )}

        <Button type="submit" size="lg" block loading={busy} leadingIcon={<LogIn className="h-4 w-4" />}>
          Sign in
        </Button>
      </form>

      <div className="mt-7 space-y-3 border-t border-ink-200/70 pt-5 text-[12px] leading-relaxed text-ink-500">
        <p>
          <strong className="font-semibold text-ink-700">This device holds your salon data.</strong>{' '}
          Signing in on another browser starts a separate empty database.
        </p>
        <p className="text-ink-400">
          Forgot the owner password? It cannot be recovered without a backup — restore one from
          Settings → Backup &amp; Restore.
        </p>
      </div>
    </AuthLayout>
  );
}
