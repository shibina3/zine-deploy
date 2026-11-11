import { db } from '@/db/database';
import type { BackupRecord } from '@/types';
import { newId } from '@/utils/id';
import { updateSettings } from './settingsRepo';

export async function recordBackup(
  input: Omit<BackupRecord, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<BackupRecord> {
  const now = Date.now();
  const record: BackupRecord = {
    ...input,
    id: newId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.backupHistory.add(record);
  return record;
}

export async function listBackups(limit = 25): Promise<BackupRecord[]> {
  return db.backupHistory.orderBy('createdAt').reverse().limit(limit).toArray();
}

export async function latestBackup(): Promise<BackupRecord | undefined> {
  return db.backupHistory.orderBy('createdAt').reverse().first();
}

export async function markBackupTime(timestamp = Date.now()): Promise<void> {
  await updateSettings({ lastBackupAt: timestamp });
}
