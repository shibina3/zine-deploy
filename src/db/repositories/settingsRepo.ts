import { db } from '@/db/database';
import type { Settings } from '@/types';
import { DEFAULT_SETTINGS, EXPENSE_CATEGORY_SEED } from '@/utils/constants';
import { newId } from '@/utils/id';
import { logAudit } from './auditRepo';

const SETTINGS_ID = 'app';

/** Loads settings, creating defaults on a brand new device. */
export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.get(SETTINGS_ID);
  if (existing) {
    await ensureExpenseCategories();
    return existing;
  }
  return ensureSettings();
}

export async function ensureSettings(): Promise<Settings> {
  const existing = await db.settings.get(SETTINGS_ID);
  if (existing) {
    await ensureExpenseCategories();
    return existing;
  }
  const now = Date.now();
  const record: Settings = {
    id: SETTINGS_ID,
    createdAt: now,
    updatedAt: now,
    ...DEFAULT_SETTINGS(),
  };
  await db.settings.put(record);
  await ensureExpenseCategories();
  return record;
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const before = await getSettings();
  const updatedAt = Date.now();
  await db.settings.update(SETTINGS_ID, { ...patch, updatedAt });
  await logAudit({
    action: 'SETTINGS_UPDATE',
    entityType: 'settings',
    entityId: SETTINGS_ID,
    previousValue: before,
    newValue: patch,
  });
}

export async function markSetupComplete(): Promise<void> {
  await db.settings.update(SETTINGS_ID, { setupComplete: true, updatedAt: Date.now() });
}

export async function ensureExpenseCategories(): Promise<void> {
  const count = await db.expenseCategories.count();
  if (count > 0) return;
  const now = Date.now();
  await db.expenseCategories.bulkAdd(
    EXPENSE_CATEGORY_SEED.map((name) => ({
      id: newId(),
      createdAt: now,
      updatedAt: now,
      name,
      isSystem: true,
    })),
  );
}

/** Requests persistent storage so the browser is less likely to evict IndexedDB. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number; persisted: boolean }> {
  try {
    const estimate = (await navigator.storage?.estimate?.()) ?? {};
    const persisted = (await navigator.storage?.persisted?.()) ?? false;
    return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0, persisted };
  } catch {
    return { usage: 0, quota: 0, persisted: false };
  }
}
