import type { Role } from '@/types';

/**
 * The currently signed-in actor, mirrored outside React so repositories can
 * attribute audit entries without importing the auth store (avoids cycles).
 */
export interface Actor {
  id?: string;
  name: string;
  role: Role;
  employeeId?: string;
}

let currentActor: Actor | null = null;

export function setActor(actor: Actor | null): void {
  currentActor = actor;
}

export function getActor(): Actor {
  return currentActor ?? { name: 'System', role: 'OWNER' };
}

export function actorIsOwner(): boolean {
  return currentActor?.role === 'OWNER';
}
