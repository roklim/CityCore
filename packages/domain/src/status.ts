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
  "commerce",
  "service",
  "hospitality",
  "editorial",
  "custom",
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const MODULE_CODES = [
  "content",
  "catalog",
  "forms_inbox",
  "booking",
  "hospitality",
  "listings",
  "directory",
  "events",
] as const;
export type ModuleCode = (typeof MODULE_CODES)[number];

export const TEMPLATE_CODES = [
  "local_business",
  "studio_service",
  "hospitality",
  "events_listings",
  "custom",
] as const;
export type TemplateCode = (typeof TEMPLATE_CODES)[number];
