import { useEffect, useState } from 'react';
import { KeyRound, LockKeyhole, Save, UserCog } from 'lucide-react';
import type { User } from '@/types';
import { useSettings, useUsers } from '@/hooks/useDb';
import { updateSettings } from '@/db/repositories/settingsRepo';
import { changePassword } from '@/services/auth/authService';
import { useCurrentUser } from '@/stores/authStore';
import { formatDate, timeAgo } from '@/utils/date';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { Avatar, Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { SectionCard } from '@/components/common/Card';
import { Field, Input } from '@/components/common/Field';
import { AuditLogPanel } from './AuditLogPanel';
import { UserDialog } from './UserDialog';

export function SecuritySettings() {
  const users = useUsers();
  const settings = useSettings();
  const currentUser = useCurrentUser();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [lockMinutes, setLockMinutes] = useState(15);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  useEffect(() => {
    if (settings) setLockMinutes(settings.lockAfterMinutes);
  }, [settings]);

  const changeMyPassword = async () => {
    if (!currentUser) return;
    if (next !== confirm) {
      notifyError('Passwords do not match', 'Re-enter the new password.');
      return;
    }
    setBusy(true);
    try {
      await changePassword(currentUser.id, current, next);
      notifySuccess('Password changed', 'Use the new password next time you sign in.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (error) {
      notifyError('Could not change password', error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title="Change your password"
        subtitle="Hashed with PBKDF2 — never stored as text"
        icon={<KeyRound className="h-4 w-4" />}
      >
        <div className="space-y-3">
          <Field label="Current password" required>
            <Input
              type="password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="New password" required>
              <Input
                type="password"
                value={next}
                onChange={(event) => setNext(event.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm new password" required>
              <Input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button loading={busy} onClick={() => void changeMyPassword()}>
              Update password
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Application lock"
        subtitle="Locks the screen after inactivity"
        icon={<LockKeyhole className="h-4 w-4" />}
      >
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Lock after (minutes)" hint="0 disables the lock.">
            <Input
              type="number"
              min={0}
              max={120}
              value={lockMinutes}
              onChange={(event) =>
                setLockMinutes(Math.min(120, Math.max(0, Number(event.target.value) || 0)))
              }
              className="w-[140px]"
            />
          </Field>
          <Button
            variant="secondary"
            leadingIcon={<Save className="h-4 w-4" />}
            onClick={async () => {
              await updateSettings({ lockAfterMinutes: lockMinutes });
              notifySuccess('Lock timeout saved');
            }}
          >
            Save
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="User accounts"
        subtitle={`${users.length} account(s) on this device`}
        icon={<UserCog className="h-4 w-4" />}
      >
        <ul className="divide-y divide-ink-100">
          {users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <Avatar name={user.displayName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink-900">
                  {user.displayName}
                  <span className="ml-1.5 text-[11px] font-normal text-ink-400">@{user.username}</span>
                </p>
                <p className="text-[11px] text-ink-500">
                  {user.role === 'OWNER'
                    ? 'Owner · full access'
                    : `Employee · ${user.permissions.length} permissions`}
                  {user.lastLoginAt
                    ? ` · last login ${timeAgo(user.lastLoginAt)}`
                    : ` · created ${formatDate(user.createdAt, 'd MMM yyyy')}`}
                </p>
              </div>
              <Badge tone={user.isActive ? 'success' : 'neutral'}>
                {user.isActive ? 'Active' : 'Disabled'}
              </Badge>
              <Button size="sm" variant="ghost" onClick={() => setEditing(user)}>
                Manage
              </Button>
            </li>
          ))}
        </ul>
      </SectionCard>

      <AuditLogPanel />
      <UserDialog open={Boolean(editing)} user={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
