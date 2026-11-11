import type { DatabaseSnapshot } from '@/types';
import { base64ToBytes, bytesToBase64 } from '@/utils/base64';

/**
 * Encrypted backup envelope.
 *
 * PBKDF2-SHA256 (210k iterations, random 16-byte salt) derives an AES-GCM-256
 * key; every backup uses a fresh 12-byte IV. AES-GCM provides the authentication
 * tag, so a corrupted or tampered backup fails to decrypt instead of restoring
 * silently-wrong data.
 */

export const BACKUP_FORMAT_VERSION = 1;
export const KDF_ITERATIONS = 210_000;

export interface BackupEnvelope {
  app: 'zine';
  format: 'zine-backup';
  version: number;
  createdAt: number;
  schemaVersion: number;
  businessName: string;
  recordCounts: Record<string, number>;
  kdf: {
    name: 'PBKDF2';
    hash: 'SHA-256';
    iterations: number;
    salt: string;
  };
  cipher: {
    name: 'AES-GCM';
    iv: string;
    tagLength: number;
  };
  /** Base64 AES-GCM ciphertext of the JSON snapshot. */
  payload: string;
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function backupFileName(at = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}-${pad(at.getHours())}${pad(
    at.getMinutes(),
  )}${pad(at.getSeconds())}`;
  return `zine-backup-${stamp}.zinebackup`;
}

export async function encryptSnapshot(
  snapshot: DatabaseSnapshot,
  passphrase: string,
): Promise<BackupEnvelope> {
  if (!passphrase || passphrase.length < 8) {
    throw new Error('The backup passphrase must be at least 8 characters.');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, KDF_ITERATIONS);
  const plaintext = new TextEncoder().encode(JSON.stringify(snapshot));
  const cipherText = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    plaintext,
  );

  return {
    app: 'zine',
    format: 'zine-backup',
    version: BACKUP_FORMAT_VERSION,
    createdAt: Date.now(),
    schemaVersion: snapshot.schemaVersion,
    businessName: snapshot.businessName,
    recordCounts: snapshot.recordCounts,
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: KDF_ITERATIONS,
      salt: bytesToBase64(salt),
    },
    cipher: { name: 'AES-GCM', iv: bytesToBase64(iv), tagLength: 128 },
    payload: bytesToBase64(new Uint8Array(cipherText)),
  };
}

export function envelopeToBlob(envelope: BackupEnvelope): Blob {
  return new Blob([JSON.stringify(envelope)], { type: 'application/octet-stream' });
}

export function isBackupEnvelope(value: unknown): value is BackupEnvelope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<BackupEnvelope>;
  return (
    candidate.app === 'zine' &&
    candidate.format === 'zine-backup' &&
    typeof candidate.payload === 'string' &&
    typeof candidate.kdf?.salt === 'string' &&
    typeof candidate.cipher?.iv === 'string'
  );
}

export async function readBackupFile(file: File | Blob): Promise<BackupEnvelope> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('This file is not a Zine backup.');
  }
  if (!isBackupEnvelope(parsed)) throw new Error('This file is not a valid Zine backup.');
  if (parsed.version > BACKUP_FORMAT_VERSION) {
    throw new Error('This backup was created by a newer version of Zine. Update the app first.');
  }
  return parsed;
}

export async function decryptEnvelope(
  envelope: BackupEnvelope,
  passphrase: string,
): Promise<DatabaseSnapshot> {
  const salt = base64ToBytes(envelope.kdf.salt);
  const iv = base64ToBytes(envelope.cipher.iv);
  const key = await deriveKey(passphrase, salt, envelope.kdf.iterations);

  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource, tagLength: envelope.cipher.tagLength ?? 128 },
      key,
      base64ToBytes(envelope.payload) as unknown as BufferSource,
    );
  } catch {
    throw new Error('Incorrect passphrase, or the backup file is corrupted.');
  }

  let snapshot: DatabaseSnapshot;
  try {
    snapshot = JSON.parse(new TextDecoder().decode(plaintext)) as DatabaseSnapshot;
  } catch {
    throw new Error('The backup decrypted but its contents are unreadable.');
  }

  if (snapshot.app !== 'zine' || !snapshot.data) {
    throw new Error('The backup decrypted but is not a Zine database snapshot.');
  }
  return snapshot;
}
