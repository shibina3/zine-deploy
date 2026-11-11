import { CloudUpload } from 'lucide-react';
import { useBackups } from '@/hooks/useDb';
import { formatDate } from '@/utils/date';
import { bytesToSize } from '@/utils/misc';
import { SectionCard } from '@/components/common/Card';

export function BackupHistory() {
  const backups = useBackups(15);

  return (
    <SectionCard title="Backup history" subtitle="Local record of backups taken from this device">
      {backups.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-ink-400">No backups yet.</p>
      ) : (
        <ul className="divide-y divide-ink-100">
          {backups.map((backup) => (
            <li key={backup.id} className="flex items-center gap-3 py-2.5">
              <span
                className={
                  backup.status === 'SUCCESS'
                    ? 'flex h-8 w-8 items-center justify-center rounded-lg bg-sage-50 text-sage-600'
                    : 'flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600'
                }
              >
                <CloudUpload className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-ink-800">{backup.filename}</p>
                <p className="text-[10.5px] text-ink-500">
                  {formatDate(backup.createdAt, 'd MMM yyyy, h:mm a')} · {backup.method}
                  {backup.sizeBytes ? ` · ${bytesToSize(backup.sizeBytes)}` : ''}
                </p>
              </div>
              <span
                className={
                  backup.status === 'SUCCESS'
                    ? 'text-[10.5px] font-semibold uppercase tracking-[0.06em] text-sage-700'
                    : 'text-[10.5px] font-semibold uppercase tracking-[0.06em] text-rose-600'
                }
              >
                {backup.status}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
        Tip: download backups to a second location (pen drive or Drive) so a lost laptop does not
        lose the backups too.
      </p>
    </SectionCard>
  );
}
