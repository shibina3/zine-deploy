import { useEffect, useState } from 'react';
import { ALL_PERMISSIONS, type Permission, type User } from '@/types';
import { PERMISSION_LABEL } from '@/utils/constants';
import { resetPassword, setUserActive, updateUserPermissions } from '@/services/auth/authService';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { Button } from '@/components/common/Button';
import { Field, Input, Switch } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';

export function UserDialog({
  open,
  user,
  onClose,
}: {
  open: boolean;
  user: User | null;
  onClose: () => void;
}) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setPermissions(user.permissions);
    setIsActive(user.isActive);
    setNewPassword('');
  }, [open, user]);

  if (!user) return null;

  const toggle = (permission: Permission) => {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  };

  const save = async () => {
    setBusy(true);
    try {
      await updateUserPermissions(user.id, permissions);
      if (isActive !== user.isActive) await setUserActive(user.id, isActive);
      if (newPassword) await resetPassword(user.id, newPassword);
      notifySuccess('Account updated', user.displayName);
      onClose();
    } catch (error) {
      notifyError('Could not update account', error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={`Account · ${user.displayName}`}
      description={`@${user.username} · ${user.role === 'OWNER' ? 'Owner (full access)' : 'Employee'}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={busy}>
            Save account
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-ink-200/80 bg-ink-50/60 p-3">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Account active"
            description="Deactivated accounts cannot sign in but their history is preserved."
          />
        </div>

        {user.role === 'EMPLOYEE' ? (
          <div>
            <p className="label mb-2">Permissions</p>
            <div className="space-y-2">
              {ALL_PERMISSIONS.map((permission) => (
                <Switch
                  key={permission}
                  checked={permissions.includes(permission)}
                  onChange={() => toggle(permission)}
                  label={PERMISSION_LABEL[permission]}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="rounded-xl bg-gold-50 px-3 py-2 text-[11.5px] text-gold-900">
            Owner accounts always have full access. Only employee permissions can be restricted.
          </p>
        )}

        <Field label="Reset password" hint="Leave blank to keep the current password.">
          <Input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="New password (8+ chars, with a number)"
            autoComplete="new-password"
          />
        </Field>
      </div>
    </Modal>
  );
}
