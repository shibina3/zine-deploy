import { db } from '@/db/database';
import { DEFAULT_EMPLOYEE_PERMISSIONS, type Permission, type User } from '@/types';
import { newId } from '@/utils/id';
import { logAudit } from '@/db/repositories/auditRepo';
import { hashPassword, verifyPassword, passwordIssues } from './password';

export type LoginResult = { ok: true; user: User } | { ok: false; error: string };

function normaliseUsername(username: string): string {
  return username.trim().toLowerCase();
}

export async function ownerExists(): Promise<boolean> {
  const owners = await db.users.where('role').equals('OWNER').count();
  return owners > 0;
}

export async function countUsers(): Promise<number> {
  return db.users.count();
}

/** Creates the very first owner account. Only valid on a fresh database. */
export async function createInitialOwner(input: {
  username: string;
  password: string;
  displayName: string;
}): Promise<User> {
  if (await ownerExists()) throw new Error('An owner account already exists on this device.');
  const issues = passwordIssues(input.password);
  if (issues.length) throw new Error(issues.join(' '));
  const username = normaliseUsername(input.username);
  if (!username) throw new Error('Username is required.');

  const record = await hashPassword(input.password);
  const now = Date.now();
  const user: User = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    username,
    displayName: input.displayName.trim() || 'Owner',
    passwordHash: record.passwordHash,
    passwordSalt: record.passwordSalt,
    iterations: record.iterations,
    role: 'OWNER',
    isActive: true,
    permissions: [],
  };
  await db.users.add(user);
  await logAudit({
    action: 'USER_CREATE',
    entityType: 'user',
    entityId: user.id,
    userName: user.displayName,
    newValue: { username, role: 'OWNER' },
  });
  return user;
}

export async function createUser(input: {
  username: string;
  password: string;
  displayName: string;
  role: User['role'];
  employeeId?: string;
  permissions?: Permission[];
}): Promise<User> {
  const issues = passwordIssues(input.password);
  if (issues.length) throw new Error(issues.join(' '));
  const username = normaliseUsername(input.username);
  if (!username) throw new Error('Username is required.');
  const clash = await db.users.where('username').equals(username).first();
  if (clash) throw new Error('That username is already taken.');

  const record = await hashPassword(input.password);
  const now = Date.now();
  const user: User = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    username,
    displayName: input.displayName.trim() || username,
    passwordHash: record.passwordHash,
    passwordSalt: record.passwordSalt,
    iterations: record.iterations,
    role: input.role,
    employeeId: input.employeeId,
    isActive: true,
    permissions: input.permissions ?? DEFAULT_EMPLOYEE_PERMISSIONS,
  };
  await db.users.add(user);
  await logAudit({
    action: 'USER_CREATE',
    entityType: 'user',
    entityId: user.id,
    newValue: { username, role: user.role, permissions: user.permissions },
  });
  return user;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const normalised = normaliseUsername(username);
  const user = await db.users.where('username').equals(normalised).first();

  if (!user || !user.isActive) {
    await logAudit({
      action: 'LOGIN_FAILED',
      entityType: 'user',
      reason: `Unknown or inactive username: ${normalised}`,
      userName: normalised,
    });
    return { ok: false, error: 'Invalid username or password.' };
  }

  const valid = await verifyPassword(password, user);
  if (!valid) {
    await logAudit({
      action: 'LOGIN_FAILED',
      entityType: 'user',
      entityId: user.id,
      reason: 'Incorrect password',
      userName: user.displayName,
    });
    return { ok: false, error: 'Invalid username or password.' };
  }

  const now = Date.now();
  await db.users.update(user.id, { lastLoginAt: now, updatedAt: now });
  await logAudit({
    action: 'LOGIN',
    entityType: 'user',
    entityId: user.id,
    userId: user.id,
    userName: user.displayName,
  });
  return { ok: true, user: { ...user, lastLoginAt: now } };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await db.users.get(userId);
  if (!user) throw new Error('User not found.');
  const valid = await verifyPassword(currentPassword, user);
  if (!valid) throw new Error('Current password is incorrect.');
  const issues = passwordIssues(newPassword);
  if (issues.length) throw new Error(issues.join(' '));

  const record = await hashPassword(newPassword);
  await db.users.update(userId, {
    passwordHash: record.passwordHash,
    passwordSalt: record.passwordSalt,
    iterations: record.iterations,
    updatedAt: Date.now(),
  });
  await logAudit({
    action: 'USER_UPDATE',
    entityType: 'user',
    entityId: userId,
    reason: 'Password changed by user',
  });
}

export async function resetPassword(userId: string, newPassword: string): Promise<void> {
  const user = await db.users.get(userId);
  if (!user) throw new Error('User not found.');
  const issues = passwordIssues(newPassword);
  if (issues.length) throw new Error(issues.join(' '));
  const record = await hashPassword(newPassword);
  await db.users.update(userId, {
    passwordHash: record.passwordHash,
    passwordSalt: record.passwordSalt,
    iterations: record.iterations,
    updatedAt: Date.now(),
  });
  await logAudit({
    action: 'USER_UPDATE',
    entityType: 'user',
    entityId: userId,
    reason: 'Password reset by owner',
  });
}

export async function setUserActive(userId: string, isActive: boolean): Promise<void> {
  await db.users.update(userId, { isActive, updatedAt: Date.now() });
  await logAudit({
    action: isActive ? 'USER_UPDATE' : 'USER_DEACTIVATE',
    entityType: 'user',
    entityId: userId,
    newValue: { isActive },
  });
}

export async function updateUserPermissions(userId: string, permissions: Permission[]): Promise<void> {
  await db.users.update(userId, { permissions, updatedAt: Date.now() });
  await logAudit({
    action: 'USER_UPDATE',
    entityType: 'user',
    entityId: userId,
    reason: 'Permissions updated',
    newValue: { permissions },
  });
}

/** Re-authenticates the signed-in user before a sensitive action. */
export async function confirmPassword(userId: string, password: string): Promise<boolean> {
  const user = await db.users.get(userId);
  if (!user) return false;
  return verifyPassword(password, user);
}
