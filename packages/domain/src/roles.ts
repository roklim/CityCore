export const USER_ROLES = ["global_admin", "city_admin", "local_admin", "staff"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_ROLES = USER_ROLES;

export type AccessRole = UserRole;

export const SCOPE_TYPES = ["platform", "city", "business"] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];
