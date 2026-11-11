import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  downloadBackup,
  listBackups,
  type DriveFile,
  type DriveSession,
} from '@/services/google-drive/drive';
import { formatDate } from '@/utils/date';
import { bytesToSize, downloadBlob } from '@/utils/misc';
import { notifyError, notifyInfo } from '@/components/common/toastStore';
import { Button } from '@/components/common/Button';

export function DriveFilesList({ session }: { session: DriveSession }) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setFiles(await listBackups(session));
    } catch (caught) {
      notifyError('Could not load Drive backups', caught instanceof Error ? caught.message : undefined);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.accessToken]);

  return (
    <div className="rounded-xl border border-ink-200/70 bg-white/60">
      <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">Drive backups</p>
        <button
          onClick={() => void refresh()}
          className="inline-flex items-center gap-1 text-[11.5px] font-medium text-wine-700"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {files.length === 0 ? (
        <p className="px-3 py-4 text-center text-[12px] text-ink-400">No backups uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-ink-100">
          {files.map((file) => (
            <li key={file.id} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-ink-800">{file.name}</p>
                <p className="text-[10.5px] text-ink-500">
                  {file.modifiedTime ? formatDate(file.modifiedTime, 'd MMM yyyy, h:mm a') : '—'}
                  {file.size ? ` · ${bytesToSize(Number(file.size))}` : ''}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                loading={busy === file.id}
                onClick={async () => {
                  setBusy(file.id);
                  try {
                    const blob = await downloadBackup(session, file.id);
                    downloadBlob(blob, file.name);
                    notifyInfo('Backup downloaded', 'Restore it below with the same passphrase.');
                  } catch (caught) {
                    notifyError('Download failed', caught instanceof Error ? caught.message : undefined);
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                Download
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
