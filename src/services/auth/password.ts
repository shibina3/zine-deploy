/**
 * Password hashing with PBKDF2-HMAC-SHA256 via the Web Crypto API.
 *
 * Argon2id is not available in browsers without WASM; PBKDF2 with a high
 * iteration count and a unique random salt is the PRD-approved fallback.
 * Plaintext passwords are never stored, logged or sent anywhere.
 */

import { base64ToBytes, bytesToBase64 } from '@/utils/base64';

export const DEFAULT_ITERATIONS = 210_000;
const KEY_BITS = 256;
const SALT_BYTES = 16;

export interface PasswordRecord {
  passwordHash: string;
  passwordSalt: string;
  iterations: number;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

/** Hash a new password with a fresh 16-byte salt. */
export async function hashPassword(
  password: string,
  iterations: number = DEFAULT_ITERATIONS,
): Promise<PasswordRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, iterations);
  return {
    passwordHash: bytesToBase64(hash),
    passwordSalt: bytesToBase64(salt),
    iterations,
  };
}

/** Constant-time comparison of derived bytes. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Verifies a candidate password against a stored record. */
export async function verifyPassword(password: string, record: PasswordRecord): Promise<boolean> {
  if (!password || !record.passwordHash || !record.passwordSalt) return false;
  const salt = base64ToBytes(record.passwordSalt);
  const derived = await derive(password, salt, record.iterations || DEFAULT_ITERATIONS);
  return timingSafeEqual(derived, base64ToBytes(record.passwordHash));
}

/** Minimum password policy used by the setup and user forms. */
export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push('Use at least 8 characters.');
  if (!/[a-zA-Z]/.test(password)) issues.push('Include at least one letter.');
  if (!/\d/.test(password)) issues.push('Include at least one number.');
  return issues;
}
