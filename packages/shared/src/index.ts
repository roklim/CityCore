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

export const USER_STATUSES = ["invited", "active", "disabled"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const CITY_STATUSES = ["active", "coming_soon", "disabled"] as const;
export type CityStatus = (typeof CITY_STATUSES)[number];

export const BUSINESS_STATUSES = ["draft", "active", "paused", "disabled"] as const;
export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

export const BUSINESS_PLANS = ["free", "pro", "premium", "enterprise"] as const;
export type BusinessPlan = (typeof BUSINESS_PLANS)[number];

export const SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const TEMPLATE_CATEGORIES = [
  "food",
  "service",
  "stays",
  "mobility",
  "rental",
  "custom",
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const MODULE_CODES = [
  "ordering",
  "appointments",
  "stays",
  "mobility_request",
  "rentals",
  "directory",
  "events",
] as const;
export type ModuleCode = (typeof MODULE_CODES)[number];

export const TEMPLATE_CODES = [
  "pizzeria",
  "restaurant",
  "sushi",
  "barber",
  "beauty",
  "bnb",
  "hotel_light",
  "taxi_ncc",
  "rental",
  "service",
  "custom",
] as const;
export type TemplateCode = (typeof TEMPLATE_CODES)[number];

export type BusinessRouteParams = {
  citySlug: string;
  businessSlug: string;
};

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildCityPath(citySlug: string) {
  return `/${citySlug}`;
}

export function buildBusinessPath({ citySlug, businessSlug }: BusinessRouteParams) {
  return `${buildCityPath(citySlug)}/${businessSlug}`;
}

export function buildBusinessAdminPath(route: BusinessRouteParams) {
  return `${buildBusinessPath(route)}/admin`;
}

export function createLookup<TValue extends { code: string }>(items: readonly TValue[]) {
  return Object.fromEntries(items.map((item) => [item.code, item])) as Record<
    TValue["code"],
    TValue
  >;
}

export function isAdminRole(role: UserRole): role is AdminRole {
  return role !== "customer";
}
