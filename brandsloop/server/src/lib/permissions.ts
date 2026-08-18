import type { Role } from '@prisma/client';

/**
 * Every protected capability in the system. Routes declare the permission they
 * need; the role matrix below decides who holds it. Keeping this in one place
 * means the API and the UI agree on what a role can do — the client asks the
 * server for its permission list rather than duplicating the rules.
 */
export const PERMISSIONS = [
  'dashboard:view',
  'product:view',
  'product:create',
  'product:update',
  'product:delete',
  'category:manage',
  'brand:manage',
  'supplier:view',
  'supplier:manage',
  'customer:view',
  'customer:manage',
  'location:view',
  'location:manage',
  'inventory:view',
  'inventory:adjust',
  'inventory:transfer',
  'inventory:count',
  'purchase:view',
  'purchase:create',
  'purchase:receive',
  'purchase:cancel',
  'sale:view',
  'sale:create',
  'sale:cancel',
  'return:view',
  'return:create',
  'report:view',
  'report:financial',
  'user:manage',
  'settings:view',
  'settings:manage',
  'audit:view',
  'notification:view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const MANAGER: Permission[] = [
  'dashboard:view',
  'product:view',
  'product:create',
  'product:update',
  'product:delete',
  'category:manage',
  'brand:manage',
  'supplier:view',
  'supplier:manage',
  'customer:view',
  'customer:manage',
  'location:view',
  'location:manage',
  'inventory:view',
  'inventory:adjust',
  'inventory:transfer',
  'inventory:count',
  'purchase:view',
  'purchase:create',
  'purchase:receive',
  'purchase:cancel',
  'sale:view',
  'sale:create',
  'sale:cancel',
  'return:view',
  'return:create',
  'report:view',
  'report:financial',
  'settings:view',
  'notification:view',
];

// Staff run the shop floor: they receive stock and ring up sales, but cannot
// delete catalogue records, manage people, or see financial/profit reporting.
const STAFF: Permission[] = [
  'dashboard:view',
  'product:view',
  'supplier:view',
  'customer:view',
  'customer:manage',
  'location:view',
  'inventory:view',
  'inventory:count',
  'purchase:view',
  'purchase:receive',
  'sale:view',
  'sale:create',
  'return:view',
  'return:create',
  'report:view',
  'notification:view',
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: PERMISSIONS,
  MANAGER: MANAGER,
  STAFF: STAFF,
};

export function permissionsFor(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
