import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, KeyRound, Sparkles, UserRound } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button } from '@/components/common/Button';
import { Field, Input, Switch } from '@/components/common/Field';
import { notifySuccess } from '@/components/common/toastStore';
import { createInitialOwner } from '@/services/auth/authService';
import { updateSettings } from '@/db/repositories/settingsRepo';
import { seedDemoData } from '@/db/demoSeed';
import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { useBoot } from '@/app/providers/bootContext';

export function SetupPage() {
  const { needsSetup, storagePersisted, completeSetup } = useBoot();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const signIn = useAuthStore((state) => state.signIn);

  const [businessName, setBusinessName] = useState('Zine Beauty Parlour');
  const [ownerName, setOwnerName] = useState('');
  const [username, setUsername] = useState('owner');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loadDemo, setLoadDemo] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;
  if (!needsSetup) return <Navigate to="/login" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!businessName.trim()) return setError('Enter your salon name.');
    if (!ownerName.trim()) return setError('Enter the owner’s name.');
    if (!username.trim()) return setError('Choose a username.');
    if (password !== confirm) return setError('The two passwords do not match.');
    if (password.length < 8) return setError('Use a password with at least 8 characters.');

    setBusy(true);
    try {
      const owner = await createInitialOwner({ username, password, displayName: ownerName.trim() });
      await updateSettings({ businessName: businessName.trim(), setupComplete: true });
      if (loadDemo) await seedDemoData();
      completeSetup();
      signIn(owner);
      notifySuccess('Welcome to Zine', 'Your salon workspace is ready.');
      navigate('/', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the owner account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-7">
        <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold-800">
          <Sparkles className="h-3 w-3" /> First run
        </p>
        <h1 className="font-display text-[30px] font-medium leading-tight tracking-tight text-ink-900">
          Set up your salon
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">
          Create the owner account for this device. You can add employees, services and prices
          right after.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Salon name" required htmlFor="businessName">
          <Input
            id="businessName"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            leading={<Building2 className="h-4 w-4" />}
            placeholder="Zine Beauty Parlour"
            autoComplete="organization"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Owner name" required htmlFor="ownerName">
            <Input
              id="ownerName"
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              leading={<UserRound className="h-4 w-4" />}
              placeholder="Anita"
              autoComplete="name"
            />
          </Field>
          <Field label="Username" required htmlFor="username" hint="Used to sign in.">
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value.replace(/\s/g, '').toLowerCase())}
              leading={<UserRound className="h-4 w-4" />}
              autoComplete="username"
              placeholder="owner"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" required htmlFor="password" hint="8+ characters, with a number.">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              leading={<KeyRound className="h-4 w-4" />}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </Field>
          <Field label="Confirm password" required htmlFor="confirm">
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              leading={<KeyRound className="h-4 w-4" />}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </Field>
        </div>

        <div className="rounded-2xl border border-ink-200/80 bg-ink-50/60 p-3.5">
          <Switch
            checked={loadDemo}
            onChange={setLoadDemo}
            label="Start with sample salon data"
            description="Adds demo services, employees, customers, appointments and a few bills so you can explore Zine. You can remove them later."
          />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-medium text-rose-700">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" block loading={busy} trailingIcon={<ArrowRight className="h-4 w-4" />}>
          Create salon & sign in
        </Button>

        <div className="rounded-xl border border-gold-200/70 bg-gold-50/60 px-3.5 py-3 text-[12px] leading-relaxed text-gold-900">
          <strong className="font-semibold">Keep these credentials safe.</strong> Zine stores data
          only on this device. The owner password protects sensitive actions and should not be
          shared with employees.
          {!storagePersisted && (
            <span className="mt-1 block text-gold-800/80">
              This browser has not granted persistent storage. Please back up regularly.
            </span>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}
