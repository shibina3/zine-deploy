import { useEffect, useState } from 'react';
import { CloudUpload, Download, KeyRound, ShieldCheck } from 'lucide-react';
import { useSettings } from '@/hooks/useDb';
import { backupOverdue, prepareBackup, recordBackupSuccess } from '@/services/backup/backupService';
import { requestPersistentStorage } from '@/db/repositories/settingsRepo';
import { bytesToSize, downloadBlob } from '@/utils/misc';
import { formatDate, timeAgo } from '@/utils/date';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { Button } from '@/components/common/Button';
import { Card, SectionCard } from '@/components/common/Card';
import { Field, Input } from '@/components/common/Field';
import { DrivePanel } from './DrivePanel';
import { RestorePanel } from './RestorePanel';
import { BackupHistory } from './BackupHistory';

export function BackupSettings() {
  const settings = useSettings();
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void requestPersistentStorage();
  }, []);

  const download = async () => {
    if (passphrase.length < 8) {
      notifyError('Passphrase too short', 'Use at least 8 characters. Keep it somewhere safe.');
      return;
    }
    if (passphrase !== confirm) {
      notifyError('Passphrases do not match', 'Re-enter the same passphrase.');
      return;
    }
    setBusy(true);
    try {
      const prepared = await prepareBackup(passphrase);
      downloadBlob(prepared.blob, prepared.fileName);
      await recordBackupSuccess(prepared, 'DOWNLOAD');
      notifySuccess(
        'Encrypted backup downloaded',
        `${prepared.fileName} · ${bytesToSize(prepared.sizeBytes)}`,
      );
    } catch (caught) {
      notifyError('Backup failed', caught instanceof Error ? caught.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const overdue = settings
    ? backupOverdue(settings.lastBackupAt, settings.backupReminderHours)
    : true;

  return (
    <div className="space-y-4">
      <SectionCard
        title="Create an encrypted backup"
        subtitle="Your only recovery path if this device fails"
        icon={<CloudUpload className="h-4 w-4" />}
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-gold-200/70 bg-gold-50/60 p-3 text-[11.5px] leading-relaxed text-gold-900">
            <p className="flex items-center gap-1.5 font-semibold">
              <KeyRound className="h-3.5 w-3.5" /> The passphrase cannot be recovered
            </p>
            <p className="mt-1">
              Backups are encrypted with AES-GCM using a key derived from this passphrase. If you
              forget it, the backup cannot be opened — by you or by anyone else.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Backup passphrase" required hint="At least 8 characters.">
              <Input
                type="password"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                placeholder="••••••••••"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm passphrase" required>
              <Input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="••••••••••"
                autoComplete="new-password"
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              leadingIcon={<Download className="h-4 w-4" />}
              loading={busy}
              onClick={() => void download()}
            >
              Download encrypted backup
            </Button>
            <span className="text-[11.5px] text-ink-500">
              Last backup: {settings?.lastBackupAt ? timeAgo(settings.lastBackupAt) : 'never'}
              {overdue && <span className="ml-2 font-medium text-gold-700">· backup due</span>}
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-ink-400">
            The file contains all customers, bills, payments, appointments, employees, stock and
            settings. It is unreadable without the passphrase.
          </p>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-900">
            <ShieldCheck className="h-3.5 w-3.5 text-sage-600" /> Backup status
          </p>
          <div className="mt-2 space-y-1.5 text-[11.5px] text-ink-500">
            <p>
              Last successful:{' '}
              {settings?.lastBackupAt
                ? formatDate(settings.lastBackupAt, 'd MMM yyyy, h:mm a')
                : '—'}
            </p>
            <p>Reminder interval: every {settings?.backupReminderHours ?? 24} hours</p>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-[12.5px] font-semibold text-ink-900">Remember</p>
          <ul className="mt-2 space-y-1 text-[11.5px] leading-relaxed text-ink-500">
            <li>• A second browser or device starts with an empty database.</li>
            <li>• Google Drive is a backup destination, not live sync.</li>
            <li>• Test a restore on another browser profile before relying on it.</li>
          </ul>
        </Card>
      </div>

      <DrivePanel passphrase={passphrase} />
      <RestorePanel passphrase={passphrase} />
      <BackupHistory />
    </div>
  );
}
