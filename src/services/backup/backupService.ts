import { db, tableByName } from '@/db/database';
import { BACKUP_TABLES, SCHEMA_VERSION } from '@/db/schema';
import type { DatabaseSnapshot } from '@/types';
import {
  BACKUP_FORMAT_VERSION,
  backupFileName,
  decryptEnvelope,
  encryptSnapshot,
  envelopeToBlob,
  readBackupFile,
  type BackupEnvelope,
} from './crypto';
import { recordBackup, markBackupTime } from '@/db/repositories/backupRepo';
import { getSettings } from '@/db/repositories/settingsRepo';
import { logAudit } from '@/db/repositories/auditRepo';

/** Tables that must exist in a restorable snapshot. */
const REQUIRED_TABLES = ['settings', 'users', 'customers', 'services', 'bills'];

/** Reads every table into a plain JSON snapshot. */
export async function exportSnapshot(): Promise<DatabaseSnapshot> {
  const settings = await getSettings();
  const data: Record<string, unknown[]> = {};
  const recordCounts: Record<string, number> = {};

  for (const name of BACKUP_TABLES) {
    const rows = await tableByName(name).toArray();
    data[name] = rows;
    recordCounts[name] = rows.length;
  }

  return {
    app: 'zine',
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    createdAt: Date.now(),
    businessName: settings.businessName,
    recordCounts,
    data,
  };
}

export interface SnapshotValidation {
  ok: boolean;
  problems: string[];
  warnings: string[];
}

export function validateSnapshot(snapshot: DatabaseSnapshot): SnapshotValidation {
  const problems: string[] = [];
  const warnings: string[] = [];

  if (snapshot.app !== 'zine') problems.push('This is not a Zine backup.');
  if (!snapshot.data || typeof snapshot.data !== 'object') problems.push('The backup has no data section.');
  if (typeof snapshot.schemaVersion === 'number' && snapshot.schemaVersion > SCHEMA_VERSION) {
    problems.push('This backup was created by a newer version of Zine. Update the app before restoring.');
  }
  for (const table of REQUIRED_TABLES) {
    if (!snapshot.data?.[table]) problems.push(`The backup is missing the "${table}" table.`);
  }

  const counts = snapshot.recordCounts ?? {};
  for (const [table, count] of Object.entries(counts)) {
    const actual = snapshot.data?.[table]?.length ?? 0;
    if (actual !== count) {
      warnings.push(`Record count mismatch in "${table}" (expected ${count}, found ${actual}).`);
    }
  }

  const users = (snapshot.data?.users ?? []) as Array<{ role?: string; isActive?: boolean }>;
  if (!users.some((user) => user.role === 'OWNER' && user.isActive)) {
    problems.push('The backup contains no active owner account, so you could not sign in after restoring.');
  }
  if (!Array.isArray(snapshot.data?.bills)) warnings.push('This backup contains no bills.');

  return { ok: problems.length === 0, problems, warnings };
}

export interface PreparedBackup {
  fileName: string;
  envelope: BackupEnvelope;
  blob: Blob;
  snapshot: DatabaseSnapshot;
  sizeBytes: number;
}

/** Exports + encrypts the current database. Nothing is uploaded here. */
export async function prepareBackup(passphrase: string): Promise<PreparedBackup> {
  const snapshot = await exportSnapshot();
  const envelope = await encryptSnapshot(snapshot, passphrase);
  const blob = envelopeToBlob(envelope);
  return {
    fileName: backupFileName(new Date(envelope.createdAt)),
    envelope,
    blob,
    snapshot,
    sizeBytes: blob.size,
  };
}

/** Records a successful backup in history and on the settings row. */
export async function recordBackupSuccess(
  prepared: PreparedBackup,
  method: 'DRIVE' | 'DOWNLOAD',
  driveFileId?: string,
): Promise<void> {
  await recordBackup({
    method,
    filename: prepared.fileName,
    sizeBytes: prepared.sizeBytes,
    recordCounts: prepared.snapshot.recordCounts,
    status: 'SUCCESS',
    driveFileId,
  });
  await markBackupTime(Date.now());
  await logAudit({
    action: 'BACKUP_CREATE',
    entityType: 'backup',
    reason:
      method === 'DRIVE'
        ? 'Uploaded encrypted backup to Google Drive'
        : 'Downloaded encrypted backup',
    newValue: { fileName: prepared.fileName, sizeBytes: prepared.sizeBytes },
  });
}

export async function recordBackupFailure(error: string, filename = 'backup'): Promise<void> {
  await recordBackup({
    method: 'DOWNLOAD',
    filename,
    sizeBytes: 0,
    recordCounts: {},
    status: 'FAILED',
    error,
  });
}

export interface DecryptedBackup {
  envelope: BackupEnvelope;
  snapshot: DatabaseSnapshot;
  validation: SnapshotValidation;
}

export async function decryptBackupFile(file: File, passphrase: string): Promise<DecryptedBackup> {
  const envelope = await readBackupFile(file);
  const snapshot = await decryptEnvelope(envelope, passphrase);
  return { envelope, snapshot, validation: validateSnapshot(snapshot) };
}

/**
 * Replaces the local database with the snapshot in one transaction. The caller
 * must confirm, and should download a safety backup first.
 */
export async function restoreSnapshot(snapshot: DatabaseSnapshot): Promise<void> {
  const validation = validateSnapshot(snapshot);
  if (!validation.ok) throw new Error(validation.problems.join(' '));

  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      const rows = snapshot.data[table.name];
      if (!Array.isArray(rows)) continue;
      await table.clear();
      await table.bulkPut(rows as never[]);
    }
  });

  await logAudit({
    action: 'BACKUP_RESTORE',
    entityType: 'database',
    reason: `Restored backup from ${new Date(snapshot.createdAt).toLocaleString()}`,
    newValue: snapshot.recordCounts,
  });
}

export function snapshotSummary(snapshot: DatabaseSnapshot): Array<{ table: string; count: number }> {
  return Object.entries(snapshot.data)
    .map(([table, rows]) => ({ table, count: Array.isArray(rows) ? rows.length : 0 }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** True when the owner should be reminded to take a backup. */
export function backupOverdue(lastBackupAt: number | undefined, reminderHours: number): boolean {
  if (!lastBackupAt) return true;
  return Date.now() - lastBackupAt > reminderHours * 3_600_000;
}
