import { z } from "zod";

export const accessRoles = ["global_admin", "city_admin", "local_admin", "staff"] as const;
export const scopeTypes = ["platform", "city", "business"] as const;
export const cityStatuses = ["active", "coming_soon", "disabled"] as const;
export const businessStatuses = ["draft", "active", "paused", "disabled"] as const;
export const businessPlans = ["free", "pro", "premium", "enterprise"] as const;
export const subscriptionStatuses = ["trialing", "active", "past_due", "cancelled"] as const;
export const templateCategories = [
  "commerce",
  "service",
  "hospitality",
  "editorial",
  "custom",
] as const;
export const userStatuses = ["invited", "active", "disabled"] as const;
export const moduleCodes = [
  "content",
  "catalog",
  "forms_inbox",
  "booking",
  "hospitality",
  "listings",
  "directory",
  "events",
] as const;
export const templateCodes = [
  "local_business",
  "studio_service",
  "hospitality",
  "events_listings",
  "custom",
] as const;

export type AccessRole = (typeof accessRoles)[number];
export type ScopeType = (typeof scopeTypes)[number];
export type CityStatus = (typeof cityStatuses)[number];
export type BusinessStatus = (typeof businessStatuses)[number];
export type BusinessPlan = (typeof businessPlans)[number];
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];
export type TemplateCategory = (typeof templateCategories)[number];
export type UserStatus = (typeof userStatuses)[number];
export type ModuleCode = (typeof moduleCodes)[number];
export type TemplateCode = (typeof templateCodes)[number];

type TemplateCatalogEntry = {
  code: TemplateCode;
  name: string;
  category: TemplateCategory;
  primaryModule: ModuleCode;
  defaultCtaLabel: string;
  summary: string;
  onboardingFields: readonly string[];
  sectionTypes: readonly string[];
};

export const templateCatalog = [
  {
    code: "local_business",
    name: "Local Business",
    category: "commerce",
    primaryModule: "catalog",
    defaultCtaLabel: "Esplora il business",
    summary: "Base per attivita locali con contenuti, catalogo e contatti pubblici.",
    onboardingFields: ["name", "city", "hours", "contacts", "catalog"],
    sectionTypes: ["hero", "highlights", "gallery", "faq", "contact"],
  },
  {
    code: "studio_service",
    name: "Studio Service",
    category: "service",
    primaryModule: "booking",
    defaultCtaLabel: "Richiedi disponibilita",
    summary: "Template per studi, professionisti e servizi locali.",
    onboardingFields: ["name", "city", "hours", "services", "contacts"],
    sectionTypes: ["hero", "services", "story", "faq", "contact"],
  },
  {
    code: "hospitality",
    name: "Hospitality",
    category: "hospitality",
    primaryModule: "hospitality",
    defaultCtaLabel: "Scopri la struttura",
    summary: "Template per strutture con galleria, informazioni pratiche e richieste.",
    onboardingFields: ["name", "city", "rooms", "policies", "contacts"],
    sectionTypes: ["hero", "highlights", "gallery", "faq", "contact"],
  },
  {
    code: "events_listings",
    name: "Events & Listings",
    category: "editorial",
    primaryModule: "listings",
    defaultCtaLabel: "Apri la vetrina",
    summary: "Template per eventi, annunci e collezioni locali.",
    onboardingFields: ["name", "city", "categories", "contacts", "story"],
    sectionTypes: ["hero", "featured", "highlights", "faq", "contact"],
  },
  {
    code: "custom",
    name: "Custom",
    category: "custom",
    primaryModule: "directory",
    defaultCtaLabel: "Scopri di piu",
    summary: "Base flessibile per onboarding manuale e configurazioni future.",
    onboardingFields: ["name", "city", "contacts", "description"],
    sectionTypes: ["hero", "highlights", "contact"],
  },
] as const satisfies readonly TemplateCatalogEntry[];

export const templateCatalogMap = new Map(templateCatalog.map((entry) => [entry.code, entry]));

const hexColorPattern = /^#?[0-9a-f]{6}$/i;
const optionalTrimmedString = z.string().trim().min(1);
const nullableTrimmedString = (max: number) =>
  z.union([z.string().trim().min(1).max(max), z.null()]).optional();
const nullableEmailString = z.union([z.string().trim().email(), z.null()]).optional();
const nullableUrlString = z.union([z.string().trim().url().max(200), z.null()]).optional();
const nullableHexColorString = z
  .union([z.string().trim().regex(hexColorPattern), z.null()])
  .optional();

export const createCitySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: optionalTrimmedString.max(120).optional(),
  province: optionalTrimmedString.max(120).optional(),
  region: optionalTrimmedString.max(120).optional(),
  country: optionalTrimmedString.max(2).optional(),
  status: z.enum(cityStatuses).default("coming_soon"),
  active: z.boolean().default(true),
  heroTitle: optionalTrimmedString.max(160).optional(),
  heroDescription: optionalTrimmedString.max(280).optional(),
  seoTitle: optionalTrimmedString.max(160).optional(),
  seoDescription: optionalTrimmedString.max(200).optional(),
  registryId: optionalTrimmedString.max(64).optional(),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});

export const updateCitySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: optionalTrimmedString.max(120).optional(),
  province: nullableTrimmedString(120),
  region: nullableTrimmedString(120),
  country: optionalTrimmedString.max(2).optional(),
  status: z.enum(cityStatuses).optional(),
  active: z.boolean().optional(),
  heroTitle: nullableTrimmedString(160),
  heroDescription: nullableTrimmedString(280),
  seoTitle: nullableTrimmedString(160),
  seoDescription: nullableTrimmedString(200),
  registryId: nullableTrimmedString(64),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export const listCitiesQuerySchema = z.object({
  status: z.enum(cityStatuses).optional(),
  active: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const listCityRegistryQuerySchema = z.object({
  q: optionalTrimmedString.max(120).optional(),
  provinceCode: optionalTrimmedString.max(8).optional(),
  regionCode: optionalTrimmedString.max(16).optional(),
  activeMunicipality: z.coerce.boolean().optional(),
  linked: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const listBusinessesQuerySchema = z.object({
  citySlug: optionalTrimmedString.max(120).optional(),
  status: z.enum(businessStatuses).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const publicListCitiesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(24).default(6),
});

export const publicCityParamsSchema = z.object({
  citySlug: optionalTrimmedString.max(120),
});

export const publicListBusinessesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(24).default(12),
});

export const publicBusinessParamsSchema = z.object({
  citySlug: optionalTrimmedString.max(120),
  businessSlug: optionalTrimmedString.max(160),
});

export const createBusinessSchema = z
  .object({
    citySlug: z.string().trim().min(2).max(120),
    templateCode: z.enum(templateCodes),
    name: z.string().trim().min(2).max(160),
    slug: optionalTrimmedString.max(160).optional(),
    legalName: optionalTrimmedString.max(160).optional(),
    category: z.enum(templateCategories).optional(),
    status: z.enum(businessStatuses).default("draft"),
    plan: z.enum(businessPlans).default("free"),
    subscriptionStatus: z.enum(subscriptionStatuses).default("trialing"),
    publicEmail: z.string().trim().email().optional(),
    publicPhone: optionalTrimmedString.max(60).optional(),
    website: z.string().trim().url().max(200).optional(),
    addressLine1: optionalTrimmedString.max(160).optional(),
    addressLine2: optionalTrimmedString.max(160).optional(),
    postalCode: optionalTrimmedString.max(20).optional(),
    locality: optionalTrimmedString.max(120).optional(),
    province: optionalTrimmedString.max(120).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    timezone: optionalTrimmedString.max(80).optional(),
    currency: optionalTrimmedString.max(8).optional(),
    locale: optionalTrimmedString.max(12).optional(),
    primaryColor: z.string().trim().regex(hexColorPattern).optional(),
    accentColor: z.string().trim().regex(hexColorPattern).optional(),
    publicTitle: optionalTrimmedString.max(160).optional(),
    publicSubtitle: optionalTrimmedString.max(200).optional(),
    publicDescription: optionalTrimmedString.max(2_000).optional(),
    seoTitle: optionalTrimmedString.max(160).optional(),
    seoDescription: optionalTrimmedString.max(200).optional(),
    bookingPolicy: optionalTrimmedString.max(2_000).optional(),
    cancellationPolicy: optionalTrimmedString.max(2_000).optional(),
    notesInternal: optionalTrimmedString.max(2_000).optional(),
    privacyContactEmail: z.string().trim().email().optional(),
    socialLinks: z.record(z.string().max(80), z.string().url().max(500)).optional(),
    logoAssetId: optionalTrimmedString.max(64).optional(),
    coverAssetId: optionalTrimmedString.max(64).optional(),
    ownerName: optionalTrimmedString.max(120).optional(),
    ownerEmail: z.string().trim().email().optional(),
    ownerPhone: optionalTrimmedString.max(60).optional(),
    modules: z.array(z.enum(moduleCodes)).max(8).optional(),
  })
  .superRefine((value, context) => {
    if ((value.ownerName || value.ownerPhone) && !value.ownerEmail) {
      context.addIssue({
        code: "custom",
        path: ["ownerEmail"],
        message: "ownerEmail is required when owner details are provided.",
      });
    }
  });

export const updateBusinessSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    slug: optionalTrimmedString.max(160).optional(),
    legalName: nullableTrimmedString(160),
    category: z.union([z.enum(templateCategories), z.null()]).optional(),
    status: z.enum(businessStatuses).optional(),
    plan: z.enum(businessPlans).optional(),
    subscriptionStatus: z.enum(subscriptionStatuses).optional(),
    publicEmail: nullableEmailString,
    publicPhone: nullableTrimmedString(60),
    website: nullableUrlString,
    addressLine1: nullableTrimmedString(160),
    addressLine2: nullableTrimmedString(160),
    postalCode: nullableTrimmedString(20),
    locality: nullableTrimmedString(120),
    province: nullableTrimmedString(120),
    lat: z.union([z.number().min(-90).max(90), z.null()]).optional(),
    lng: z.union([z.number().min(-180).max(180), z.null()]).optional(),
    timezone: optionalTrimmedString.max(80).optional(),
    currency: optionalTrimmedString.max(8).optional(),
    locale: optionalTrimmedString.max(12).optional(),
    primaryColor: nullableHexColorString,
    accentColor: nullableHexColorString,
    publicTitle: nullableTrimmedString(160),
    publicSubtitle: nullableTrimmedString(200),
    publicDescription: nullableTrimmedString(2_000),
    seoTitle: nullableTrimmedString(160),
    seoDescription: nullableTrimmedString(200),
    bookingPolicy: nullableTrimmedString(2_000),
    cancellationPolicy: nullableTrimmedString(2_000),
    notesInternal: nullableTrimmedString(2_000),
    privacyContactEmail: nullableEmailString,
    socialLinks: z
      .union([z.record(z.string().max(80), z.string().url().max(500)), z.null()])
      .optional(),
    logoAssetId: z.union([z.string().trim().min(1).max(64), z.null()]).optional(),
    coverAssetId: z.union([z.string().trim().min(1).max(64), z.null()]).optional(),
    ownerEmail: z.union([z.string().trim().email(), z.null()]).optional(),
    ownerName: nullableTrimmedString(120),
    ownerPhone: nullableTrimmedString(60),
  })
  .superRefine((value, context) => {
    if ((value.ownerName || value.ownerPhone) && !value.ownerEmail) {
      context.addIssue({
        code: "custom",
        path: ["ownerEmail"],
        message: "ownerEmail is required when owner details are provided.",
      });
    }
  });

export const listAccessGrantsQuerySchema = z.object({
  role: z.enum(accessRoles).optional(),
  scopeType: z.enum(scopeTypes).optional(),
  active: z.coerce.boolean().optional(),
  userEmail: optionalTrimmedString.max(200).optional(),
  citySlug: optionalTrimmedString.max(120).optional(),
  businessSlug: optionalTrimmedString.max(120).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const listAuditLogsQuerySchema = z.object({
  action: optionalTrimmedString.max(200).optional(),
  targetType: optionalTrimmedString.max(120).optional(),
  scopeType: z.enum(scopeTypes).optional(),
  citySlug: optionalTrimmedString.max(120).optional(),
  businessSlug: optionalTrimmedString.max(120).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const createAccessGrantSchema = z
  .object({
    userId: optionalTrimmedString.max(64).optional(),
    userEmail: z.string().trim().email().optional(),
    userName: optionalTrimmedString.max(120).optional(),
    userPhone: optionalTrimmedString.max(60).optional(),
    userStatus: z.enum(userStatuses).default("invited"),
    password: z.string().min(8).max(200).optional(),
    role: z.enum(accessRoles),
    scopeType: z.enum(scopeTypes),
    citySlug: optionalTrimmedString.max(120).optional(),
    businessSlug: optionalTrimmedString.max(120).optional(),
    active: z.boolean().default(true),
  })
  .superRefine((value, context) => {
    if (!value.userId && !value.userEmail) {
      context.addIssue({
        code: "custom",
        path: ["userEmail"],
        message: "userId or userEmail is required.",
      });
    }

    if (value.role === "global_admin" && value.scopeType !== "platform") {
      context.addIssue({
        code: "custom",
        path: ["scopeType"],
        message: "global_admin grants must use platform scope.",
      });
    }

    if (value.role === "city_admin" && value.scopeType !== "city") {
      context.addIssue({
        code: "custom",
        path: ["scopeType"],
        message: "city_admin grants must use city scope.",
      });
    }

    if (
      (value.role === "local_admin" || value.role === "staff") &&
      value.scopeType !== "business"
    ) {
      context.addIssue({
        code: "custom",
        path: ["scopeType"],
        message: "local_admin and staff grants must use business scope.",
      });
    }

    if (value.scopeType === "city" && !value.citySlug) {
      context.addIssue({
        code: "custom",
        path: ["citySlug"],
        message: "citySlug is required for city scoped grants.",
      });
    }

    if (value.scopeType === "business" && (!value.citySlug || !value.businessSlug)) {
      context.addIssue({
        code: "custom",
        path: ["businessSlug"],
        message: "citySlug and businessSlug are required for business scoped grants.",
      });
    }
  });

export const accessGrantParamsSchema = z.object({
  accessGrantId: optionalTrimmedString.max(64),
});

export const updateAccessGrantSchema = z.object({
  active: z.boolean().optional(),
});
