import { useEffect, useState } from 'react';
import { CloudUpload, Link2, Unplug } from 'lucide-react';
import { useSettings } from '@/hooks/useDb';
import { updateSettings } from '@/db/repositories/settingsRepo';
import { prepareBackup, recordBackupSuccess } from '@/services/backup/backupService';
import { requestDriveAccess, uploadBackup, type DriveSession } from '@/services/google-drive/drive';
import { bytesToSize } from '@/utils/misc';
import { notifyError, notifyInfo, notifySuccess } from '@/components/common/toastStore';
import { Button } from '@/components/common/Button';
import { SectionCard } from '@/components/common/Card';
import { Field, Input } from '@/components/common/Field';
import { DriveFilesList } from './DriveFilesList';

export function DrivePanel({ passphrase }: { passphrase: string }) {
  const settings = useSettings();
  const [clientId, setClientId] = useState('');
  const [session, setSession] = useState<DriveSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (settings) setClientId(settings.googleClientId);
  }, [settings]);

  const connect = async () => {
    setError('');
    setBusy(true);
    try {
      if (settings && clientId !== settings.googleClientId) {
        await updateSettings({ googleClientId: clientId });
      }
      const next = await requestDriveAccess(clientId);
      setSession(next);
      notifySuccess('Google Drive connected', 'Access token kept in memory only.');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not connect to Google Drive.';
      setError(message);
      notifyError('Google Drive', message);
    } finally {
      setBusy(false);
    }
  };

  const upload = async () => {
    if (!session) return;
    if (passphrase.length < 8) {
      notifyError('Passphrase required', 'Enter the backup passphrase above first.');
      return;
    }
    setBusy(true);
    try {
      const prepared = await prepareBackup(passphrase);
      const file = await uploadBackup(session, prepared.fileName, prepared.blob);
      await recordBackupSuccess(prepared, 'DRIVE', file.id);
      setRefreshKey((value) => value + 1);
      notifySuccess('Backup uploaded', `${prepared.fileName} · ${bytesToSize(prepared.sizeBytes)}`);
    } catch (caught) {
      notifyError('Upload failed', caught instanceof Error ? caught.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title="Google Drive (optional)"
      subtitle="Encrypted backups in Zine’s private app folder"
      icon={<CloudUpload className="h-4 w-4" />}
    >
      <div className="space-y-3">
        <Field
          label="Google OAuth client ID"
          hint="Create a Web application OAuth client in Google Cloud Console and add this site as an authorised origin."
        >
          <Input
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            placeholder="1234567890-abc.apps.googleusercontent.com"
          />
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={session ? 'secondary' : 'primary'}
            loading={busy}
            leadingIcon={<Link2 className="h-4 w-4" />}
            onClick={() => void connect()}
          >
            {session ? 'Reconnect Drive' : 'Connect Google Drive'}
          </Button>
          {session && (
            <>
              <Button
                variant="gold"
                loading={busy}
                leadingIcon={<CloudUpload className="h-4 w-4" />}
                onClick={() => void upload()}
              >
                Upload backup now
              </Button>
              <Button
                variant="ghost"
                leadingIcon={<Unplug className="h-4 w-4" />}
                onClick={() => {
                  setSession(null);
                  notifyInfo('Disconnected', 'The access token was discarded from memory.');
                }}
              >
                Disconnect
              </Button>
            </>
          )}
        </div>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">
            {error}
          </p>
        )}

        {session && <DriveFilesList key={refreshKey} session={session} />}

        <p className="text-[11px] leading-relaxed text-ink-400">
          Drive is a backup destination, never a live database. Access tokens stay in memory and
          expire automatically; Zine cannot run unattended backups after the browser closes.
        </p>
      </div>
    </SectionCard>
  );
}
