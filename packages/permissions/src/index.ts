export const ROLE_PERMISSIONS = {
  global_admin: ["platform.manage", "cities.manage", "businesses.manage"],
  city_admin: ["cities.read", "businesses.read", "businesses.manage"],
  local_admin: [
    "business.read",
    "orders.manage",
    "menu.manage",
    "availability.manage",
    "settings.manage",
  ],
  staff: ["business.read", "orders.manage", "availability.manage"],
  customer: ["profile.manage", "orders.own.read"],
} as const;

export type PlatformRole = keyof typeof ROLE_PERMISSIONS;
