import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { setActor } from '@/services/actor';
import { ensureSettings, getSettings, updateSettings } from '@/db/repositories/settingsRepo';

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
  await ensureSettings();
  setActor({ id: 'owner', name: 'Owner', role: 'OWNER' });
});

describe('settings persistence', () => {
  it('keeps a business name update', async () => {
    await updateSettings({ businessName: 'Source Parlour', setupComplete: true });
    const row = await getSettings();
    expect(row.businessName).toBe('Source Parlour');
    expect((await db.settings.get('app'))?.businessName).toBe('Source Parlour');
  });

  it('does not reset the salon profile when the app boots again', async () => {
    await updateSettings({ businessName: 'Source Parlour', setupComplete: true });
    // Simulate a page reload: the boot provider calls ensureSettings() again.
    const booted = await ensureSettings();
    expect(booted.businessName).toBe('Source Parlour');
    expect(booted.setupComplete).toBe(true);
    expect((await db.settings.get('app'))?.businessName).toBe('Source Parlour');
  });
});
