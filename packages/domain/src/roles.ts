export const USER_ROLES = [
  "global_admin",
  "city_admin",
  "local_admin",
  "staff",
  "customer",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_ROLES = USER_ROLES.filter((role) => role !== "customer") as readonly Exclude<
  UserRole,
  "customer"
>[];

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type AccessRole = AdminRole;

export const SCOPE_TYPES = ["platform", "city", "business"] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];
