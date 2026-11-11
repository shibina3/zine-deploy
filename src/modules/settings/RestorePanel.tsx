import { useRef, useState } from 'react';
import { AlertTriangle, DatabaseBackup, FileUp } from 'lucide-react';
import {
  decryptBackupFile,
  prepareBackup,
  restoreSnapshot,
  type DecryptedBackup,
} from '@/services/backup/backupService';
import { downloadBlob } from '@/utils/misc';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { Button } from '@/components/common/Button';
import { SectionCard } from '@/components/common/Card';
import { ConfirmDialog } from '@/components/common/Modal';
import { Field } from '@/components/common/Field';

export function RestorePanel({ passphrase }: { passphrase: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [decrypted, setDecrypted] = useState<DecryptedBackup | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const inspect = async () => {
    setError('');
    setDecrypted(null);
    if (!file) return setError('Choose a .zinebackup file first.');
    if (passphrase.length < 8) return setError('Enter the backup passphrase to decrypt the file.');
    setBusy(true);
    try {
      const result = await decryptBackupFile(file, passphrase);
      setDecrypted(result);
      notifySuccess('Backup decrypted', 'Review the summary before restoring.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not decrypt this backup.');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (!decrypted) return;
    setBusy(true);
    try {
      const safety = await prepareBackup(passphrase);
      downloadBlob(safety.blob, `zine-safety-${Date.now()}.zinebackup`);
      await restoreSnapshot(decrypted.snapshot);
      notifySuccess('Restore complete', 'Reloading Zine with the restored data…');
      setTimeout(() => window.location.reload(), 1500);
    } catch (caught) {
      notifyError('Restore failed', caught instanceof Error ? caught.message : undefined);
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title="Restore from backup"
      subtitle="Restoring replaces the current local dataset"
      icon={<DatabaseBackup className="h-4 w-4" />}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-gold-200/70 bg-gold-50/60 p-3 text-[11.5px] leading-relaxed text-gold-900">
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" /> Restoring overwrites this device
          </p>
          <p className="mt-1">
            A safety backup of the current data downloads automatically before restoring. Keep that
            file — it is the only way back.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Encrypted backup file" hint="Only .zinebackup files created by Zine.">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-10 w-full items-center gap-2 rounded-xl border border-dashed border-ink-300 bg-white px-3 text-left text-[12.5px] text-ink-600 hover:border-gold-400"
            >
              <FileUp className="h-4 w-4 shrink-0 text-gold-600" />
              <span className="truncate">{file ? file.name : 'Choose file…'}</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".zinebackup,application/json,application/octet-stream"
              className="hidden"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setDecrypted(null);
                setError('');
              }}
            />
          </Field>
          <Button variant="secondary" loading={busy} onClick={() => void inspect()}>
            Inspect backup
          </Button>
        </div>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">
            {error}
          </p>
        )}

        {decrypted && (
          <div className="space-y-3 rounded-2xl border border-ink-200/70 bg-ink-50/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-sage-100 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-sage-700">
                Integrity verified
              </span>
              <span className="text-[11.5px] text-ink-500">
                {decrypted.snapshot.businessName} ·{' '}
                {new Date(decrypted.snapshot.createdAt).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <RestoreStat label="Bills" value={decrypted.snapshot.recordCounts.bills ?? 0} />
              <RestoreStat label="Customers" value={decrypted.snapshot.recordCounts.customers ?? 0} />
              <RestoreStat label="Payments" value={decrypted.snapshot.recordCounts.payments ?? 0} />
              <RestoreStat
                label="Appointments"
                value={decrypted.snapshot.recordCounts.appointments ?? 0}
              />
            </div>

            {decrypted.validation.warnings.length > 0 && (
              <ul className="space-y-1 rounded-xl bg-gold-50 px-3 py-2 text-[11.5px] text-gold-900">
                {decrypted.validation.warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            )}

            {decrypted.validation.problems.length > 0 ? (
              <ul className="space-y-1 rounded-xl bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700">
                {decrypted.validation.problems.map((problem) => (
                  <li key={problem}>• {problem}</li>
                ))}
              </ul>
            ) : (
              <Button variant="danger" onClick={() => setConfirmOpen(true)} disabled={busy}>
                Restore this backup
              </Button>
            )}

            <p className="text-[11px] leading-relaxed text-ink-400">
              After restoring, sign in with the owner credentials stored inside that backup.
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={restore}
        title="Replace all local data?"
        description="The current customers, bills, appointments and settings will be replaced by the backup. A safety backup downloads first."
        confirmLabel="Restore backup"
        busy={busy}
      />
    </SectionCard>
  );
}

function RestoreStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white px-2.5 py-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-400">{label}</p>
      <p className="text-[13px] font-semibold tabular-nums text-ink-800">{value}</p>
    </div>
  );
}

