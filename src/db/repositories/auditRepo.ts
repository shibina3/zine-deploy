import { db } from '@/db/database';
import type { AuditAction, AuditLog, ID } from '@/types';
import { newId } from '@/utils/id';
import { getActor } from '@/services/actor';

/**
 * Append-only audit trail. Audit rows are never updated or deleted by the
 * application, so sensitive actions keep their history even after a bill or
 * salary record changes.
 */

export interface AuditInput {
  action: AuditAction;
  entityType: string;
  entityId?: ID;
  reason?: string;
  previousValue?: unknown;
  newValue?: unknown;
  userId?: ID;
  userName?: string;
}

function serialise(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function logAudit(input: AuditInput): Promise<void> {
  const actor = getActor();
  const now = Date.now();
  const row: AuditLog = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    userId: input.userId ?? actor.id,
    userName: input.userName ?? actor.name,
    reason: input.reason,
    previousValue: serialise(input.previousValue),
    newValue: serialise(input.newValue),
  };
  await db.auditLogs.add(row);
}

export async function listAuditLogs(limit = 200): Promise<AuditLog[]> {
  const rows = await db.auditLogs.orderBy('createdAt').reverse().limit(limit).toArray();
  return rows;
}

export async function auditForEntity(entityId: ID): Promise<AuditLog[]> {
  return db.auditLogs.where('entityId').equals(entityId).reverse().sortBy('createdAt');
}
