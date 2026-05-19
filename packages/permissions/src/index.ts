import type { ScopeType, UserRole } from "@platform/domain";

export const PERMISSION_CODES = [
  "platform.read",
  "platform.manage",
  "cities.read",
  "cities.manage",
  "businesses.read",
  "businesses.manage",
  "business_users.manage",
  "content.manage",
  "catalog.manage",
  "modules.manage",
  "profile.manage",
  "settings.manage",
  "events.manage",
  "listings.manage",
] as const;

export type PlatformPermission = (typeof PERMISSION_CODES)[number];

export const ROLE_PERMISSIONS = {
  global_admin: PERMISSION_CODES,
  city_admin: [
    "platform.read",
    "cities.read",
    "cities.manage",
    "businesses.read",
    "businesses.manage",
    "business_users.manage",
    "events.manage",
    "listings.manage",
  ],
  local_admin: [
    "businesses.read",
    "content.manage",
    "catalog.manage",
    "modules.manage",
    "settings.manage",
    "listings.manage",
    "events.manage",
  ],
  staff: [
    "businesses.read",
    "content.manage",
    "catalog.manage",
    "listings.manage",
    "events.manage",
  ],
  customer: ["profile.manage"],
} as const satisfies Record<UserRole, readonly PlatformPermission[]>;

export type AccessGrantLike = {
  role: UserRole;
  scopeType: ScopeType;
  cityId?: string | null;
  businessId?: string | null;
  active?: boolean;
};

export type PermissionContext = {
  scopeType?: ScopeType;
  cityId?: string | null;
  businessId?: string | null;
};

export function getRolePermissions(role: UserRole) {
  return ROLE_PERMISSIONS[role] as readonly PlatformPermission[];
}

export function roleHasPermission(role: UserRole, permission: PlatformPermission) {
  return getRolePermissions(role).includes(permission);
}

export function listPermissionsForRoles(roles: readonly UserRole[]) {
  return [...new Set(roles.flatMap((role) => getRolePermissions(role)))];
}

export function scopeMatches(grant: AccessGrantLike, context: PermissionContext = {}) {
  if (grant.active === false) {
    return false;
  }

  if (!context.scopeType) {
    return true;
  }

  if (grant.role === "global_admin" && grant.scopeType === "platform") {
    return true;
  }

  if (context.scopeType === "platform") {
    return grant.scopeType === "platform";
  }

  if (context.scopeType === "city") {
    return grant.scopeType === "city" && grant.cityId === context.cityId;
  }

  if (context.scopeType === "business") {
    if (grant.scopeType === "business") {
      return grant.businessId === context.businessId;
    }

    if (grant.scopeType === "city") {
      return Boolean(context.cityId) && grant.cityId === context.cityId;
    }
  }

  return false;
}

export function canAccess(
  grant: AccessGrantLike,
  permission: PlatformPermission,
  context: PermissionContext = {},
) {
  return roleHasPermission(grant.role, permission) && scopeMatches(grant, context);
}
