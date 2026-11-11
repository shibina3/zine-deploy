import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { setActor } from '@/services/actor';
import { ensureSettings } from '@/db/repositories/settingsRepo';
import { saveCustomer } from '@/db/repositories/customerRepo';
import { saveService } from '@/db/repositories/serviceRepo';
import { createInitialOwner } from '@/services/auth/authService';
import {
  decryptBackupFile,
  exportSnapshot,
  prepareBackup,
  restoreSnapshot,
  validateSnapshot,
} from '@/services/backup/backupService';
import { decryptEnvelope, readBackupFile, type BackupEnvelope } from '@/services/backup/crypto';

const PASSPHRASE = 'correct horse battery staple';

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
  await ensureSettings();
  setActor({ id: 'owner', name: 'Owner', role: 'OWNER' });
});

async function seed() {
  await createInitialOwner({ username: 'owner', password: 'salon1234', displayName: 'Owner' });
  const customer = await saveCustomer({ name: 'Kavya Iyer', phone: '9900112277' });
  const service = await saveService({
    name: 'Gel Manicure',
    category: 'Nails',
    price: 150_000,
    durationMinutes: 60,
  });
  return { customer, service };
}

async function envelopeFrom(blob: Blob): Promise<BackupEnvelope> {
  const file = new File([blob], 'backup.zinebackup', { type: 'application/octet-stream' });
  return readBackupFile(file);
}

describe('encrypted backups', () => {
  it('exports a complete snapshot with record counts', async () => {
    await seed();
    const snapshot = await exportSnapshot();

    expect(snapshot.app).toBe('zine');
    expect(snapshot.recordCounts.customers).toBe(1);
    expect(snapshot.recordCounts.services).toBe(1);
    expect(snapshot.recordCounts.users).toBe(1);
    expect(Array.isArray(snapshot.data.bills)).toBe(true);
  });

  it('encrypts with PBKDF2 + AES-GCM metadata and never leaks plaintext', async () => {
    await seed();
    const prepared = await prepareBackup(PASSPHRASE);
    const text = await prepared.blob.text();

    expect(text).not.toContain('Kavya Iyer');
    expect(prepared.envelope.kdf.name).toBe('PBKDF2');
    expect(prepared.envelope.kdf.iterations).toBeGreaterThanOrEqual(100_000);
    expect(prepared.envelope.cipher.name).toBe('AES-GCM');
    expect(prepared.fileName.startsWith('zine-backup-')).toBe(true);
  });

  it('decrypts with the right passphrase and rejects the wrong one', async () => {
    await seed();
    const prepared = await prepareBackup(PASSPHRASE);
    const envelope = await envelopeFrom(prepared.blob);

    await expect(decryptEnvelope(envelope, 'wrong-passphrase')).rejects.toThrow();

    const snapshot = await decryptEnvelope(envelope, PASSPHRASE);
    expect(snapshot.recordCounts.customers).toBe(1);
    expect((snapshot.data.customers as Array<{ name: string }>)[0].name).toBe('Kavya Iyer');
  });

  it('rejects tampered ciphertext via the AES-GCM tag', async () => {
    await seed();
    const prepared = await prepareBackup(PASSPHRASE);
    const envelope = await envelopeFrom(prepared.blob);
    const tampered: BackupEnvelope = {
      ...envelope,
      payload: `${envelope.payload.slice(0, -4)}AAAA`,
    };
    await expect(decryptEnvelope(tampered, PASSPHRASE)).rejects.toThrow();
  });

  it('restores a snapshot and replaces the current dataset', async () => {
    const { customer } = await seed();
    const prepared = await prepareBackup(PASSPHRASE);
    const envelope = await envelopeFrom(prepared.blob);
    const snapshot = await decryptEnvelope(envelope, PASSPHRASE);

    await db.customers.delete(customer.id);
    expect(await db.customers.count()).toBe(0);

    await restoreSnapshot(snapshot);

    expect(await db.customers.count()).toBe(1);
    expect((await db.customers.get(customer.id))?.name).toBe('Kavya Iyer');
    expect(await db.users.count()).toBe(1);
  });

  it('summarises validation problems for an incomplete snapshot', async () => {
    const snapshot = await exportSnapshot();
    const broken = { ...snapshot, data: { ...snapshot.data, users: [] } };
    const validation = validateSnapshot(broken);
    expect(validation.ok).toBe(false);
    expect(validation.problems.join(' ')).toMatch(/owner/i);
  });

  it('reads a backup file back through the public file API', async () => {
    await seed();
    const prepared = await prepareBackup(PASSPHRASE);
    const file = new File([prepared.blob], prepared.fileName, { type: 'application/octet-stream' });
    const result = await decryptBackupFile(file, PASSPHRASE);
    expect(result.validation.ok).toBe(true);
    expect(result.snapshot.recordCounts.customers).toBe(1);
  });
});
