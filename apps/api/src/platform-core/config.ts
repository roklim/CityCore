import { z } from "zod";

export const accessRoles = ["global_admin", "city_admin", "local_admin", "staff"] as const;
export const scopeTypes = ["platform", "city", "business"] as const;
export const cityStatuses = ["active", "coming_soon", "disabled"] as const;
export const businessStatuses = ["draft", "active", "paused", "disabled"] as const;
export const businessPlans = ["free", "pro", "premium", "enterprise"] as const;
export const subscriptionStatuses = ["trialing", "active", "past_due", "cancelled"] as const;
export const templateCategories = [
  "food",
  "service",
  "stays",
  "mobility",
  "rental",
  "custom",
] as const;
export const userStatuses = ["invited", "active", "disabled"] as const;
export const moduleCodes = [
  "ordering",
  "appointments",
  "stays",
  "mobility_request",
  "rentals",
  "directory",
  "events",
] as const;
export const templateCodes = [
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
    code: "pizzeria",
    name: "Pizzeria",
    category: "food",
    primaryModule: "ordering",
    defaultCtaLabel: "Ordina ora",
    summary: "Locale food con menu, disponibilita rapida e carrello.",
    onboardingFields: ["name", "city", "hours", "menu", "contacts"],
    sectionTypes: ["hero", "menu_preview", "faq", "gallery", "contact"],
  },
  {
    code: "restaurant",
    name: "Restaurant",
    category: "food",
    primaryModule: "ordering",
    defaultCtaLabel: "Scopri il menu",
    summary: "Ristorante con discovery menu, tavolozza visuale e ordering leggero.",
    onboardingFields: ["name", "city", "hours", "menu", "story"],
    sectionTypes: ["hero", "highlights", "menu_preview", "gallery", "contact"],
  },
  {
    code: "sushi",
    name: "Sushi",
    category: "food",
    primaryModule: "ordering",
    defaultCtaLabel: "Ordina sushi",
    summary: "Verticale food veloce con menu, combo e disponibilita in tempo reale.",
    onboardingFields: ["name", "city", "hours", "menu", "deliveryArea"],
    sectionTypes: ["hero", "menu_preview", "faq", "gallery", "contact"],
  },
  {
    code: "barber",
    name: "Barber",
    category: "service",
    primaryModule: "appointments",
    defaultCtaLabel: "Prenota taglio",
    summary: "Servizi prenotabili con slot, staff e disponibilita.",
    onboardingFields: ["name", "city", "hours", "services", "staff"],
    sectionTypes: ["hero", "services", "faq", "gallery", "contact"],
  },
  {
    code: "beauty",
    name: "Beauty",
    category: "service",
    primaryModule: "appointments",
    defaultCtaLabel: "Prenota trattamento",
    summary: "Centro estetico con servizi, durate e agenda appuntamenti.",
    onboardingFields: ["name", "city", "hours", "services", "staff"],
    sectionTypes: ["hero", "services", "gallery", "faq", "contact"],
  },
  {
    code: "bnb",
    name: "B&B",
    category: "stays",
    primaryModule: "stays",
    defaultCtaLabel: "Verifica disponibilita",
    summary: "Struttura light con camere, regole base e richiesta soggiorno.",
    onboardingFields: ["name", "city", "rooms", "contacts", "policies"],
    sectionTypes: ["hero", "rooms", "faq", "gallery", "contact"],
  },
  {
    code: "hotel_light",
    name: "Hotel Light",
    category: "stays",
    primaryModule: "stays",
    defaultCtaLabel: "Prenota soggiorno",
    summary: "Struttura ricettiva con camere, disponibilita e richiesta diretta.",
    onboardingFields: ["name", "city", "rooms", "contacts", "policies"],
    sectionTypes: ["hero", "highlights", "rooms", "gallery", "contact"],
  },
  {
    code: "taxi_ncc",
    name: "Taxi / NCC",
    category: "mobility",
    primaryModule: "mobility_request",
    defaultCtaLabel: "Richiedi trasporto",
    summary: "Modulo richiesta corsa per operatori locali senza dispatch hard realtime.",
    onboardingFields: ["name", "city", "serviceArea", "hours", "contacts"],
    sectionTypes: ["hero", "transport", "faq", "contact"],
  },
  {
    code: "rental",
    name: "Rental",
    category: "rental",
    primaryModule: "rentals",
    defaultCtaLabel: "Prenota noleggio",
    summary: "Noleggio con item, durata, disponibilita e riconsegna.",
    onboardingFields: ["name", "city", "inventory", "hours", "contacts"],
    sectionTypes: ["hero", "highlights", "gallery", "faq", "contact"],
  },
  {
    code: "service",
    name: "Service",
    category: "service",
    primaryModule: "directory",
    defaultCtaLabel: "Contatta attivita",
    summary: "Template generalista per attivita locali non ancora verticalizzate.",
    onboardingFields: ["name", "city", "hours", "contacts", "description"],
    sectionTypes: ["hero", "highlights", "faq", "contact"],
  },
  {
    code: "custom",
    name: "Custom",
    category: "custom",
    primaryModule: "directory",
    defaultCtaLabel: "Scopri di piu",
    summary: "Base flessibile per onboarding manuale o verticale futuro.",
    onboardingFields: ["name", "city", "contacts", "description"],
    sectionTypes: ["hero", "highlights", "contact"],
  },
] as const satisfies readonly TemplateCatalogEntry[];

export const templateCatalogMap = new Map(templateCatalog.map((entry) => [entry.code, entry]));

const hexColorPattern = /^#?[0-9a-f]{6}$/i;
const optionalTrimmedString = z.string().trim().min(1);

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
  limit: z.coerce.number().int().positive().max(24).default(6),
});

export const publicCityParamsSchema = z.object({
  citySlug: optionalTrimmedString.max(120),
});

export const publicListBusinessesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(24).default(6),
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
