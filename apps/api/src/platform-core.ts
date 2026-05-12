import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { canAccess, getRequestAuth, hashPassword, requireAuth, requirePermission } from "./auth.js";
import { prisma } from "./database.js";

const accessRoles = ["global_admin", "city_admin", "local_admin", "staff"] as const;
const scopeTypes = ["platform", "city", "business"] as const;
const cityStatuses = ["active", "coming_soon", "disabled"] as const;
const businessStatuses = ["draft", "active", "paused", "disabled"] as const;
const businessPlans = ["free", "pro", "premium", "enterprise"] as const;
const subscriptionStatuses = ["trialing", "active", "past_due", "cancelled"] as const;
const templateCategories = ["food", "service", "stays", "mobility", "rental", "custom"] as const;
const userStatuses = ["invited", "active", "disabled"] as const;
const moduleCodes = [
  "ordering",
  "appointments",
  "stays",
  "mobility_request",
  "rentals",
  "directory",
  "events",
] as const;
const templateCodes = [
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

type AccessRole = (typeof accessRoles)[number];
type ScopeType = (typeof scopeTypes)[number];
type CityStatus = (typeof cityStatuses)[number];
type BusinessStatus = (typeof businessStatuses)[number];
type BusinessPlan = (typeof businessPlans)[number];
type SubscriptionStatus = (typeof subscriptionStatuses)[number];
type TemplateCategory = (typeof templateCategories)[number];
type UserStatus = (typeof userStatuses)[number];
type ModuleCode = (typeof moduleCodes)[number];
type TemplateCode = (typeof templateCodes)[number];

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

const templateCatalog = [
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

const templateCatalogMap = new Map(templateCatalog.map((entry) => [entry.code, entry]));
const hexColorPattern = /^#?[0-9a-f]{6}$/i;

const optionalTrimmedString = z.string().trim().min(1);

const createCitySchema = z.object({
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

const listCitiesQuerySchema = z.object({
  status: z.enum(cityStatuses).optional(),
  active: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

const listCityRegistryQuerySchema = z.object({
  q: optionalTrimmedString.max(120).optional(),
  provinceCode: optionalTrimmedString.max(8).optional(),
  regionCode: optionalTrimmedString.max(16).optional(),
  activeMunicipality: z.coerce.boolean().optional(),
  linked: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

const listBusinessesQuerySchema = z.object({
  citySlug: optionalTrimmedString.max(120).optional(),
  status: z.enum(businessStatuses).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

const publicListCitiesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(24).default(6),
});

const publicCityParamsSchema = z.object({
  citySlug: optionalTrimmedString.max(120),
});

const publicListBusinessesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(24).default(6),
});

const publicBusinessParamsSchema = z.object({
  citySlug: optionalTrimmedString.max(120),
  businessSlug: optionalTrimmedString.max(160),
});

const createBusinessSchema = z
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

const listAccessGrantsQuerySchema = z.object({
  role: z.enum(accessRoles).optional(),
  scopeType: z.enum(scopeTypes).optional(),
  active: z.coerce.boolean().optional(),
  userEmail: optionalTrimmedString.max(200).optional(),
  citySlug: optionalTrimmedString.max(120).optional(),
  businessSlug: optionalTrimmedString.max(120).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

const listAuditLogsQuerySchema = z.object({
  action: optionalTrimmedString.max(200).optional(),
  targetType: optionalTrimmedString.max(120).optional(),
  scopeType: z.enum(scopeTypes).optional(),
  citySlug: optionalTrimmedString.max(120).optional(),
  businessSlug: optionalTrimmedString.max(120).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

const createAccessGrantSchema = z
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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeOptionalString(value?: string | null) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

function normalizeColor(value?: string) {
  if (!value) {
    return null;
  }

  return value.startsWith("#") ? value : `#${value}`;
}

function parsePayload<T>(schema: z.ZodSchema<T>, payload: unknown) {
  const result = schema.safeParse(payload);

  if (!result.success) {
    return {
      success: false as const,
      response: {
        statusCode: 400,
        body: {
          status: "error",
          error: "Invalid request payload",
          details: z.treeifyError(result.error),
        },
      },
    };
  }

  return {
    success: true as const,
    data: result.data,
  };
}

function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function mapCity(city: {
  id: string;
  name: string;
  slug: string;
  province: string | null;
  region: string | null;
  country: string;
  status: CityStatus;
  active: boolean;
  sortOrder: number;
  heroTitle: string | null;
  heroDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    businesses: number;
  };
}) {
  return {
    id: city.id,
    name: city.name,
    slug: city.slug,
    province: city.province,
    region: city.region,
    country: city.country,
    status: city.status,
    active: city.active,
    sortOrder: city.sortOrder,
    heroTitle: city.heroTitle,
    heroDescription: city.heroDescription,
    seoTitle: city.seoTitle,
    seoDescription: city.seoDescription,
    businessCount: city._count?.businesses ?? 0,
    createdAt: city.createdAt,
    updatedAt: city.updatedAt,
  };
}

function mapCityRegistryEntry(entry: {
  id: string;
  name: string;
  slug: string;
  provinceCode: string | null;
  provinceName: string | null;
  regionCode: string | null;
  regionName: string | null;
  country: string;
  istatCode: string | null;
  cadastralCode: string | null;
  source: string | null;
  sourceVersion: string | null;
  lat: number | null;
  lng: number | null;
  activeMunicipality: boolean;
  searchText: string | null;
  createdAt: Date;
  updatedAt: Date;
  cities?: Array<{
    id: string;
    name: string;
    slug: string;
    status: CityStatus;
    active: boolean;
  }>;
}) {
  return {
    id: entry.id,
    name: entry.name,
    slug: entry.slug,
    provinceCode: entry.provinceCode,
    provinceName: entry.provinceName,
    regionCode: entry.regionCode,
    regionName: entry.regionName,
    country: entry.country,
    istatCode: entry.istatCode,
    cadastralCode: entry.cadastralCode,
    source: entry.source,
    sourceVersion: entry.sourceVersion,
    lat: entry.lat,
    lng: entry.lng,
    activeMunicipality: entry.activeMunicipality,
    searchText: entry.searchText,
    linkedCity:
      entry.cities && entry.cities.length > 0
        ? {
            id: entry.cities[0].id,
            name: entry.cities[0].name,
            slug: entry.cities[0].slug,
            status: entry.cities[0].status,
            active: entry.cities[0].active,
          }
        : null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function mapBusiness(business: {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  category: TemplateCategory | null;
  status: BusinessStatus;
  plan: BusinessPlan;
  subscriptionStatus: SubscriptionStatus;
  publicEmail: string | null;
  publicPhone: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  timezone: string;
  currency: string;
  locale: string;
  primaryColor: string | null;
  accentColor: string | null;
  publicTitle: string | null;
  publicSubtitle: string | null;
  publicDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  bookingPolicy: string | null;
  cancellationPolicy: string | null;
  notesInternal: string | null;
  createdAt: Date;
  updatedAt: Date;
  city: {
    id: string;
    name: string;
    slug: string;
    status: CityStatus;
  };
  template: {
    id: string;
    code: string;
    name: string;
    category: TemplateCategory;
    primaryModule: ModuleCode;
    defaultCtaLabel: string | null;
  };
  modules: Array<{
    moduleCode: ModuleCode;
    active: boolean;
  }>;
  ownerUser: {
    id: string;
    email: string;
    name: string | null;
    status: "invited" | "active" | "disabled";
  } | null;
}) {
  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    legalName: business.legalName,
    category: business.category,
    status: business.status,
    plan: business.plan,
    subscriptionStatus: business.subscriptionStatus,
    publicEmail: business.publicEmail,
    publicPhone: business.publicPhone,
    website: business.website,
    addressLine1: business.addressLine1,
    addressLine2: business.addressLine2,
    postalCode: business.postalCode,
    timezone: business.timezone,
    currency: business.currency,
    locale: business.locale,
    primaryColor: business.primaryColor,
    accentColor: business.accentColor,
    publicTitle: business.publicTitle,
    publicSubtitle: business.publicSubtitle,
    publicDescription: business.publicDescription,
    seoTitle: business.seoTitle,
    seoDescription: business.seoDescription,
    bookingPolicy: business.bookingPolicy,
    cancellationPolicy: business.cancellationPolicy,
    notesInternal: business.notesInternal,
    city: business.city,
    template: business.template,
    modules: business.modules,
    owner: business.ownerUser,
    createdAt: business.createdAt,
    updatedAt: business.updatedAt,
  };
}

function mapPublicCity(city: {
  id: string;
  name: string;
  slug: string;
  province: string | null;
  region: string | null;
  country: string;
  status: CityStatus;
  heroTitle: string | null;
  heroDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  businesses?: Array<{
    id: string;
  }>;
}) {
  return {
    id: city.id,
    name: city.name,
    slug: city.slug,
    province: city.province,
    region: city.region,
    country: city.country,
    status: city.status,
    heroTitle: city.heroTitle,
    heroDescription: city.heroDescription,
    seoTitle: city.seoTitle,
    seoDescription: city.seoDescription,
    businessCount: city.businesses?.length ?? 0,
  };
}

function mapPublicBusiness(business: {
  id: string;
  name: string;
  slug: string;
  category: TemplateCategory | null;
  status: BusinessStatus;
  publicEmail: string | null;
  publicPhone: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  timezone: string;
  currency: string;
  locale: string;
  primaryColor: string | null;
  accentColor: string | null;
  publicTitle: string | null;
  publicSubtitle: string | null;
  publicDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  bookingPolicy: string | null;
  cancellationPolicy: string | null;
  createdAt: Date;
  updatedAt: Date;
  city: {
    id: string;
    name: string;
    slug: string;
    status: CityStatus;
  };
  template: {
    id: string;
    code: string;
    name: string;
    category: TemplateCategory;
    primaryModule: ModuleCode;
    defaultCtaLabel: string | null;
  };
  modules: Array<{
    moduleCode: ModuleCode;
    active: boolean;
  }>;
}) {
  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    category: business.category,
    status: business.status,
    publicEmail: business.publicEmail,
    publicPhone: business.publicPhone,
    website: business.website,
    addressLine1: business.addressLine1,
    addressLine2: business.addressLine2,
    postalCode: business.postalCode,
    timezone: business.timezone,
    currency: business.currency,
    locale: business.locale,
    primaryColor: business.primaryColor,
    accentColor: business.accentColor,
    publicTitle: business.publicTitle,
    publicSubtitle: business.publicSubtitle,
    publicDescription: business.publicDescription,
    seoTitle: business.seoTitle,
    seoDescription: business.seoDescription,
    bookingPolicy: business.bookingPolicy,
    cancellationPolicy: business.cancellationPolicy,
    city: business.city,
    template: business.template,
    modules: business.modules,
    createdAt: business.createdAt,
    updatedAt: business.updatedAt,
  };
}

function mapAccessGrant(grant: {
  id: string;
  role: AccessRole;
  scopeType: ScopeType;
  active: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    status: UserStatus;
    lastLoginAt: Date | null;
  };
  city: {
    id: string;
    name: string;
    slug: string;
    status: CityStatus;
  } | null;
  business: {
    id: string;
    name: string;
    slug: string;
    status: BusinessStatus;
    city: {
      id: string;
      name: string;
      slug: string;
      status: CityStatus;
    };
  } | null;
}) {
  return {
    id: grant.id,
    role: grant.role,
    scopeType: grant.scopeType,
    active: grant.active,
    lastUsedAt: grant.lastUsedAt,
    createdAt: grant.createdAt,
    updatedAt: grant.updatedAt,
    user: grant.user,
    city: grant.business?.city ?? grant.city,
    business: grant.business,
  };
}

function mapAuditLog(log: {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  scopeType: ScopeType;
  metadataJson: Prisma.JsonValue | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  actorUser: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  city: {
    id: string;
    name: string;
    slug: string;
    status: CityStatus;
  } | null;
  business: {
    id: string;
    name: string;
    slug: string;
    status: BusinessStatus;
    city: {
      id: string;
      name: string;
      slug: string;
      status: CityStatus;
    };
  } | null;
}) {
  return {
    id: log.id,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    scopeType: log.scopeType,
    metadataJson: log.metadataJson,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
    actorUser: log.actorUser,
    city: log.business?.city ?? log.city,
    business: log.business,
  };
}

async function ensureTemplateRecord(code: TemplateCode) {
  const definition = templateCatalogMap.get(code);

  if (!definition) {
    throw new Error(`Unknown template code: ${code}`);
  }

  return prisma.businessTemplate.upsert({
    where: {
      code: definition.code,
    },
    update: {
      name: definition.name,
      category: definition.category,
      primaryModule: definition.primaryModule,
      fieldSchemaJson: definition.onboardingFields as Prisma.InputJsonValue,
      sectionSchemaJson: definition.sectionTypes as Prisma.InputJsonValue,
      defaultCtaLabel: definition.defaultCtaLabel,
      active: true,
    },
    create: {
      code: definition.code,
      name: definition.name,
      category: definition.category,
      primaryModule: definition.primaryModule,
      fieldSchemaJson: definition.onboardingFields as Prisma.InputJsonValue,
      sectionSchemaJson: definition.sectionTypes as Prisma.InputJsonValue,
      defaultCtaLabel: definition.defaultCtaLabel,
      active: true,
    },
  });
}

function buildAccessibleCityFilter(auth: ReturnType<typeof getRequestAuth>) {
  if (auth.activeAccess.scopeType === "city" && auth.activeAccess.cityId) {
    return {
      id: auth.activeAccess.cityId,
    };
  }

  if (auth.activeAccess.scopeType === "business" && auth.activeAccess.cityId) {
    return {
      id: auth.activeAccess.cityId,
    };
  }

  return {};
}

function buildAccessibleBusinessFilter(auth: ReturnType<typeof getRequestAuth>) {
  if (auth.activeAccess.scopeType === "business" && auth.activeAccess.businessId) {
    return {
      id: auth.activeAccess.businessId,
    };
  }

  if (auth.activeAccess.scopeType === "city" && auth.activeAccess.cityId) {
    return {
      cityId: auth.activeAccess.cityId,
    };
  }

  return {};
}

function buildAccessibleAccessGrantFilter(auth: ReturnType<typeof getRequestAuth>) {
  if (auth.activeAccess.scopeType === "business" && auth.activeAccess.businessId) {
    return {
      businessId: auth.activeAccess.businessId,
    };
  }

  if (auth.activeAccess.scopeType === "city" && auth.activeAccess.cityId) {
    return {
      cityId: auth.activeAccess.cityId,
    };
  }

  return {};
}

function buildAccessibleAuditLogFilter(auth: ReturnType<typeof getRequestAuth>) {
  if (auth.activeAccess.scopeType === "business" && auth.activeAccess.businessId) {
    return {
      businessId: auth.activeAccess.businessId,
    };
  }

  if (auth.activeAccess.scopeType === "city" && auth.activeAccess.cityId) {
    return {
      cityId: auth.activeAccess.cityId,
    };
  }

  return {};
}

export function registerPlatformCoreRoutes(app: FastifyInstance) {
  app.get("/api/v2/public", async () => ({
    status: "ok",
    area: "public-catalog",
    capabilities: {
      cities: ["/api/v2/public/cities", "/api/v2/public/cities/:citySlug"],
      businesses: [
        "/api/v2/public/businesses",
        "/api/v2/public/cities/:citySlug/businesses",
        "/api/v2/public/cities/:citySlug/businesses/:businessSlug",
      ],
    },
  }));

  app.get("/api/v2/public/cities", async (request, reply) => {
    const parsed = parsePayload(publicListCitiesQuerySchema, request.query);

    if (!parsed.success) {
      return reply.code(parsed.response.statusCode).send(parsed.response.body);
    }

    const cities = await prisma.city.findMany({
      where: {
        active: true,
        status: {
          not: "disabled",
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: parsed.data.limit,
      include: {
        businesses: {
          where: {
            status: "active",
          },
          select: {
            id: true,
          },
        },
      },
    });

    return reply.send({
      status: "ok",
      items: cities.map(mapPublicCity),
    });
  });

  app.get("/api/v2/public/cities/:citySlug", async (request, reply) => {
    const parsed = parsePayload(publicCityParamsSchema, request.params);

    if (!parsed.success) {
      return reply.code(parsed.response.statusCode).send(parsed.response.body);
    }

    const city = await prisma.city.findFirst({
      where: {
        slug: parsed.data.citySlug,
        active: true,
        status: {
          not: "disabled",
        },
      },
      include: {
        businesses: {
          where: {
            status: "active",
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!city) {
      return reply.code(404).send({
        status: "error",
        error: "City not found",
      });
    }

    return reply.send({
      status: "ok",
      item: mapPublicCity(city),
    });
  });

  app.get("/api/v2/public/businesses", async (request, reply) => {
    const parsed = parsePayload(publicListBusinessesQuerySchema, request.query);

    if (!parsed.success) {
      return reply.code(parsed.response.statusCode).send(parsed.response.body);
    }

    const businesses = await prisma.business.findMany({
      where: {
        status: "active",
        city: {
          active: true,
          status: {
            not: "disabled",
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: parsed.data.limit,
      include: {
        city: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
        template: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            primaryModule: true,
            defaultCtaLabel: true,
          },
        },
        modules: {
          orderBy: {
            moduleCode: "asc",
          },
          select: {
            moduleCode: true,
            active: true,
          },
        },
      },
    });

    return reply.send({
      status: "ok",
      items: businesses.map(mapPublicBusiness),
    });
  });

  app.get("/api/v2/public/cities/:citySlug/businesses", async (request, reply) => {
    const paramsParsed = parsePayload(publicCityParamsSchema, request.params);
    const queryParsed = parsePayload(publicListBusinessesQuerySchema, request.query);

    if (!paramsParsed.success) {
      return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
    }

    if (!queryParsed.success) {
      return reply.code(queryParsed.response.statusCode).send(queryParsed.response.body);
    }

    const city = await prisma.city.findFirst({
      where: {
        slug: paramsParsed.data.citySlug,
        active: true,
        status: {
          not: "disabled",
        },
      },
      select: {
        id: true,
      },
    });

    if (!city) {
      return reply.code(404).send({
        status: "error",
        error: "City not found",
      });
    }

    const businesses = await prisma.business.findMany({
      where: {
        cityId: city.id,
        status: "active",
      },
      orderBy: [{ createdAt: "desc" }],
      take: queryParsed.data.limit,
      include: {
        city: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
        template: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            primaryModule: true,
            defaultCtaLabel: true,
          },
        },
        modules: {
          orderBy: {
            moduleCode: "asc",
          },
          select: {
            moduleCode: true,
            active: true,
          },
        },
      },
    });

    return reply.send({
      status: "ok",
      items: businesses.map(mapPublicBusiness),
    });
  });

  app.get("/api/v2/public/cities/:citySlug/businesses/:businessSlug", async (request, reply) => {
    const parsed = parsePayload(publicBusinessParamsSchema, request.params);

    if (!parsed.success) {
      return reply.code(parsed.response.statusCode).send(parsed.response.body);
    }

    const business = await prisma.business.findFirst({
      where: {
        slug: parsed.data.businessSlug,
        status: "active",
        city: {
          slug: parsed.data.citySlug,
          active: true,
          status: {
            not: "disabled",
          },
        },
      },
      include: {
        city: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
        template: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            primaryModule: true,
            defaultCtaLabel: true,
          },
        },
        modules: {
          orderBy: {
            moduleCode: "asc",
          },
          select: {
            moduleCode: true,
            active: true,
          },
        },
      },
    });

    if (!business) {
      return reply.code(404).send({
        status: "error",
        error: "Business not found",
      });
    }

    return reply.send({
      status: "ok",
      item: mapPublicBusiness(business),
    });
  });

  app.get(
    "/api/v2/platform-core",
    { preHandler: requirePermission("platform.read") },
    async () => ({
      status: "ok",
      milestone: "platform-core",
      capabilities: {
        templates: ["/api/v2/platform-core/templates"],
        cityRegistry: ["/api/v2/platform-core/city-registry"],
        cities: ["/api/v2/platform-core/cities"],
        businesses: ["/api/v2/platform-core/businesses"],
        accessGrants: ["/api/v2/platform-core/access-grants"],
        auditLogs: ["/api/v2/platform-core/audit-logs"],
      },
    }),
  );

  app.get(
    "/api/v2/platform-core/templates",
    { preHandler: requirePermission("platform.read") },
    async () => {
      const persistedTemplates = await prisma.businessTemplate.findMany({
        select: {
          id: true,
          code: true,
          active: true,
          updatedAt: true,
        },
      });

      const persistedByCode = new Map(
        persistedTemplates.map((template) => [template.code, template]),
      );

      return {
        status: "ok",
        items: templateCatalog.map((template) => {
          const persisted = persistedByCode.get(template.code);

          return {
            ...template,
            persisted: Boolean(persisted),
            templateId: persisted?.id ?? null,
            active: persisted?.active ?? true,
            updatedAt: persisted?.updatedAt ?? null,
          };
        }),
      };
    },
  );

  app.get(
    "/api/v2/platform-core/city-registry",
    { preHandler: requirePermission("platform.read", () => ({ scopeType: "platform" })) },
    async (request, reply) => {
      const parsed = parsePayload(listCityRegistryQuerySchema, request.query);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const filters: Prisma.CityRegistryWhereInput[] = [];

      if (parsed.data.q) {
        filters.push({
          OR: [
            {
              searchText: {
                contains: parsed.data.q.toLowerCase(),
              },
            },
            {
              name: {
                contains: parsed.data.q,
                mode: "insensitive",
              },
            },
            {
              slug: {
                contains: slugify(parsed.data.q),
              },
            },
          ],
        });
      }

      if (parsed.data.provinceCode) {
        filters.push({
          provinceCode: parsed.data.provinceCode.toUpperCase(),
        });
      }

      if (parsed.data.regionCode) {
        filters.push({
          regionCode: parsed.data.regionCode,
        });
      }

      if (parsed.data.activeMunicipality != null) {
        filters.push({
          activeMunicipality: parsed.data.activeMunicipality,
        });
      }

      if (parsed.data.linked === true) {
        filters.push({
          cities: {
            some: {},
          },
        });
      } else if (parsed.data.linked === false) {
        filters.push({
          cities: {
            none: {},
          },
        });
      }

      const entries = await prisma.cityRegistry.findMany({
        where: filters.length > 0 ? { AND: filters } : undefined,
        orderBy: [{ name: "asc" }],
        take: parsed.data.limit,
        include: {
          cities: {
            orderBy: [{ createdAt: "asc" }],
            take: 1,
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              active: true,
            },
          },
        },
      });

      return reply.send({
        status: "ok",
        items: entries.map(mapCityRegistryEntry),
      });
    },
  );

  app.get(
    "/api/v2/platform-core/cities",
    { preHandler: requirePermission("cities.read") },
    async (request, reply) => {
      const parsed = parsePayload(listCitiesQuerySchema, request.query);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const cities = await prisma.city.findMany({
        where: {
          ...buildAccessibleCityFilter(auth),
          status: parsed.data.status,
          active: parsed.data.active,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: parsed.data.limit,
        include: {
          _count: {
            select: {
              businesses: true,
            },
          },
        },
      });

      return {
        status: "ok",
        items: cities.map(mapCity),
      };
    },
  );

  app.post(
    "/api/v2/platform-core/cities",
    { preHandler: requirePermission("platform.manage", () => ({ scopeType: "platform" })) },
    async (request, reply) => {
      const parsed = parsePayload(createCitySchema, request.body);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);

      if (parsed.data.registryId) {
        const registry = await prisma.cityRegistry.findUnique({
          where: {
            id: parsed.data.registryId,
          },
          select: {
            id: true,
          },
        });

        if (!registry) {
          return reply.code(404).send({
            status: "error",
            error: "City registry entry not found",
          });
        }
      }

      try {
        const city = await prisma.$transaction(async (tx) => {
          const createdCity = await tx.city.create({
            data: {
              registryId: parsed.data.registryId ?? null,
              name: parsed.data.name,
              slug: slugify(parsed.data.slug ?? parsed.data.name),
              province: parsed.data.province ?? null,
              region: parsed.data.region ?? null,
              country: parsed.data.country ?? "IT",
              status: parsed.data.status,
              active: parsed.data.active,
              heroTitle: parsed.data.heroTitle ?? null,
              heroDescription: parsed.data.heroDescription ?? null,
              seoTitle: parsed.data.seoTitle ?? null,
              seoDescription: parsed.data.seoDescription ?? null,
              sortOrder: parsed.data.sortOrder,
            },
            include: {
              _count: {
                select: {
                  businesses: true,
                },
              },
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: auth.user.id,
              action: "platform.city.created",
              targetType: "city",
              targetId: createdCity.id,
              scopeType: "platform",
              cityId: createdCity.id,
              metadataJson: {
                slug: createdCity.slug,
                status: createdCity.status,
              },
            },
          });

          return createdCity;
        });

        return reply.code(201).send({
          status: "ok",
          item: mapCity(city),
        });
      } catch (error) {
        if (isPrismaError(error, "P2002")) {
          return reply.code(409).send({
            status: "error",
            error: "A city with the same slug or registry reference already exists.",
          });
        }

        throw error;
      }
    },
  );

  app.get(
    "/api/v2/platform-core/businesses",
    { preHandler: requirePermission("businesses.read") },
    async (request, reply) => {
      const parsed = parsePayload(listBusinessesQuerySchema, request.query);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const businesses = await prisma.business.findMany({
        where: {
          ...buildAccessibleBusinessFilter(auth),
          status: parsed.data.status,
          city: parsed.data.citySlug
            ? {
                slug: parsed.data.citySlug,
              }
            : undefined,
        },
        orderBy: [{ createdAt: "desc" }],
        take: parsed.data.limit,
        include: {
          city: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
          template: {
            select: {
              id: true,
              code: true,
              name: true,
              category: true,
              primaryModule: true,
              defaultCtaLabel: true,
            },
          },
          modules: {
            orderBy: {
              moduleCode: "asc",
            },
            select: {
              moduleCode: true,
              active: true,
            },
          },
          ownerUser: {
            select: {
              id: true,
              email: true,
              name: true,
              status: true,
            },
          },
        },
      });

      return {
        status: "ok",
        items: businesses.map(mapBusiness),
      };
    },
  );

  app.post(
    "/api/v2/platform-core/businesses",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = parsePayload(createBusinessSchema, request.body);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const city = await prisma.city.findUnique({
        where: {
          slug: parsed.data.citySlug,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      });

      if (!city) {
        return reply.code(404).send({
          status: "error",
          error: "City not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "businesses.manage", {
          scopeType: "city",
          cityId: city.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const template = await ensureTemplateRecord(parsed.data.templateCode);
      const definition = templateCatalogMap.get(parsed.data.templateCode);

      if (!definition) {
        return reply.code(400).send({
          status: "error",
          error: "Template catalog definition not found",
        });
      }

      const requestedModules = parsed.data.modules ?? [];
      const moduleSet = new Set<ModuleCode>([definition.primaryModule, ...requestedModules]);

      try {
        const business = await prisma.$transaction(async (tx) => {
          let ownerUserId: string | null = null;

          if (parsed.data.ownerEmail) {
            const existingOwner = await tx.user.findUnique({
              where: {
                email: parsed.data.ownerEmail,
              },
              select: {
                id: true,
              },
            });

            if (existingOwner) {
              ownerUserId = existingOwner.id;
            } else {
              const createdOwner = await tx.user.create({
                data: {
                  email: parsed.data.ownerEmail,
                  name: normalizeOptionalString(parsed.data.ownerName),
                  phone: normalizeOptionalString(parsed.data.ownerPhone),
                  status: "invited",
                },
                select: {
                  id: true,
                },
              });

              ownerUserId = createdOwner.id;
            }
          }

          const createdBusiness = await tx.business.create({
            data: {
              cityId: city.id,
              templateId: template.id,
              name: parsed.data.name,
              slug: slugify(parsed.data.slug ?? parsed.data.name),
              legalName: normalizeOptionalString(parsed.data.legalName),
              category: parsed.data.category ?? definition.category,
              status: parsed.data.status,
              plan: parsed.data.plan,
              subscriptionStatus: parsed.data.subscriptionStatus,
              publicEmail: parsed.data.publicEmail ?? null,
              publicPhone: normalizeOptionalString(parsed.data.publicPhone),
              website: parsed.data.website ?? null,
              addressLine1: normalizeOptionalString(parsed.data.addressLine1),
              addressLine2: normalizeOptionalString(parsed.data.addressLine2),
              postalCode: normalizeOptionalString(parsed.data.postalCode),
              timezone: parsed.data.timezone ?? "Europe/Rome",
              currency: parsed.data.currency ?? "EUR",
              locale: parsed.data.locale ?? "it-IT",
              ownerUserId,
              primaryColor: normalizeColor(parsed.data.primaryColor),
              accentColor: normalizeColor(parsed.data.accentColor),
              publicTitle: normalizeOptionalString(parsed.data.publicTitle),
              publicSubtitle: normalizeOptionalString(parsed.data.publicSubtitle),
              publicDescription: normalizeOptionalString(parsed.data.publicDescription),
              seoTitle: normalizeOptionalString(parsed.data.seoTitle),
              seoDescription: normalizeOptionalString(parsed.data.seoDescription),
              bookingPolicy: normalizeOptionalString(parsed.data.bookingPolicy),
              cancellationPolicy: normalizeOptionalString(parsed.data.cancellationPolicy),
              notesInternal: normalizeOptionalString(parsed.data.notesInternal),
            },
            include: {
              city: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                },
              },
              template: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  category: true,
                  primaryModule: true,
                  defaultCtaLabel: true,
                },
              },
              ownerUser: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  status: true,
                },
              },
              modules: {
                select: {
                  moduleCode: true,
                  active: true,
                },
              },
            },
          });

          if (moduleSet.size > 0) {
            await tx.businessModule.createMany({
              data: [...moduleSet].map((moduleCode) => ({
                businessId: createdBusiness.id,
                moduleCode,
                active: true,
              })),
            });
          }

          if (ownerUserId) {
            await tx.accessGrant.create({
              data: {
                userId: ownerUserId,
                role: "local_admin",
                scopeType: "business",
                cityId: city.id,
                businessId: createdBusiness.id,
                active: true,
                createdByUserId: auth.user.id,
              },
            });
          }

          await tx.auditLog.create({
            data: {
              actorUserId: auth.user.id,
              action: "platform.business.created",
              targetType: "business",
              targetId: createdBusiness.id,
              scopeType: "business",
              cityId: city.id,
              businessId: createdBusiness.id,
              metadataJson: {
                citySlug: city.slug,
                templateCode: template.code,
                moduleCodes: [...moduleSet],
                ownerUserId,
              },
            },
          });

          return tx.business.findUniqueOrThrow({
            where: {
              id: createdBusiness.id,
            },
            include: {
              city: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                },
              },
              template: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  category: true,
                  primaryModule: true,
                  defaultCtaLabel: true,
                },
              },
              modules: {
                orderBy: {
                  moduleCode: "asc",
                },
                select: {
                  moduleCode: true,
                  active: true,
                },
              },
              ownerUser: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  status: true,
                },
              },
            },
          });
        });

        return reply.code(201).send({
          status: "ok",
          item: mapBusiness(business),
        });
      } catch (error) {
        if (isPrismaError(error, "P2002")) {
          return reply.code(409).send({
            status: "error",
            error: "A business with the same slug already exists in this city.",
          });
        }

        throw error;
      }
    },
  );

  app.get(
    "/api/v2/platform-core/access-grants",
    { preHandler: requirePermission("business_users.manage") },
    async (request, reply) => {
      const parsed = parsePayload(listAccessGrantsQuerySchema, request.query);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const grants = await prisma.accessGrant.findMany({
        where: {
          role: parsed.data.role,
          scopeType: parsed.data.scopeType,
          active: parsed.data.active,
          user: parsed.data.userEmail
            ? {
                email: parsed.data.userEmail,
              }
            : undefined,
          ...buildAccessibleAccessGrantFilter(auth),
          city:
            parsed.data.citySlug && !parsed.data.businessSlug
              ? {
                  slug: parsed.data.citySlug,
                }
              : undefined,
          business: parsed.data.businessSlug
            ? {
                slug: parsed.data.businessSlug,
                city: parsed.data.citySlug
                  ? {
                      slug: parsed.data.citySlug,
                    }
                  : undefined,
              }
            : undefined,
        },
        orderBy: [{ createdAt: "desc" }],
        take: parsed.data.limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              status: true,
              lastLoginAt: true,
            },
          },
          city: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
          business: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              city: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      return reply.send({
        status: "ok",
        items: grants.map(mapAccessGrant),
      });
    },
  );

  app.get(
    "/api/v2/platform-core/audit-logs",
    { preHandler: requirePermission("platform.read") },
    async (request, reply) => {
      const parsed = parsePayload(listAuditLogsQuerySchema, request.query);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const logs = await prisma.auditLog.findMany({
        where: {
          action: parsed.data.action
            ? {
                contains: parsed.data.action,
                mode: "insensitive",
              }
            : undefined,
          targetType: parsed.data.targetType
            ? {
                equals: parsed.data.targetType,
                mode: "insensitive",
              }
            : undefined,
          scopeType: parsed.data.scopeType,
          city:
            parsed.data.citySlug && !parsed.data.businessSlug
              ? {
                  slug: parsed.data.citySlug,
                }
              : undefined,
          business: parsed.data.businessSlug
            ? {
                slug: parsed.data.businessSlug,
                city: parsed.data.citySlug
                  ? {
                      slug: parsed.data.citySlug,
                    }
                  : undefined,
              }
            : undefined,
          ...buildAccessibleAuditLogFilter(auth),
        },
        orderBy: [{ createdAt: "desc" }],
        take: parsed.data.limit,
        include: {
          actorUser: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          city: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
          business: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              city: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      return reply.send({
        status: "ok",
        items: logs.map(mapAuditLog),
      });
    },
  );

  app.post(
    "/api/v2/platform-core/access-grants",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = parsePayload(createAccessGrantSchema, request.body);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const city =
        parsed.data.citySlug != null
          ? await prisma.city.findUnique({
              where: {
                slug: parsed.data.citySlug,
              },
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
              },
            })
          : null;

      if (parsed.data.citySlug && !city) {
        return reply.code(404).send({
          status: "error",
          error: "City not found",
        });
      }

      const business =
        parsed.data.businessSlug != null
          ? await prisma.business.findFirst({
              where: {
                slug: parsed.data.businessSlug,
                city: parsed.data.citySlug
                  ? {
                      slug: parsed.data.citySlug,
                    }
                  : undefined,
              },
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                city: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    status: true,
                  },
                },
              },
            })
          : null;

      if (parsed.data.businessSlug && !business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      const permissionContext =
        parsed.data.scopeType === "platform"
          ? { scopeType: "platform" as const }
          : parsed.data.scopeType === "city"
            ? { scopeType: "city" as const, cityId: city?.id ?? null }
            : {
                scopeType: "business" as const,
                cityId: business?.city.id ?? city?.id ?? null,
                businessId: business?.id ?? null,
              };

      if (!canAccess(auth.activeAccess, "business_users.manage", permissionContext)) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const cityId = business?.city.id ?? city?.id ?? null;
      const businessId = business?.id ?? null;

      try {
        const accessGrant = await prisma.$transaction(async (tx) => {
          let userId = parsed.data.userId ?? null;

          if (userId) {
            const existingUser = await tx.user.findUnique({
              where: {
                id: userId,
              },
              select: {
                id: true,
              },
            });

            if (!existingUser) {
              throw new Error("USER_NOT_FOUND");
            }
          } else if (parsed.data.userEmail) {
            const existingUser = await tx.user.findUnique({
              where: {
                email: parsed.data.userEmail,
              },
              select: {
                id: true,
                status: true,
                passwordHash: true,
              },
            });

            if (existingUser) {
              userId = existingUser.id;

              if (parsed.data.password && !existingUser.passwordHash) {
                await tx.user.update({
                  where: {
                    id: existingUser.id,
                  },
                  data: {
                    name: normalizeOptionalString(parsed.data.userName),
                    phone: normalizeOptionalString(parsed.data.userPhone),
                    status: parsed.data.userStatus,
                    passwordHash: hashPassword(parsed.data.password),
                  },
                });
              }
            } else {
              const createdUser = await tx.user.create({
                data: {
                  email: parsed.data.userEmail,
                  name: normalizeOptionalString(parsed.data.userName),
                  phone: normalizeOptionalString(parsed.data.userPhone),
                  status: parsed.data.password ? "active" : parsed.data.userStatus,
                  passwordHash: parsed.data.password ? hashPassword(parsed.data.password) : null,
                },
                select: {
                  id: true,
                },
              });

              userId = createdUser.id;
            }
          }

          if (!userId) {
            throw new Error("USER_NOT_RESOLVED");
          }

          const duplicate = await tx.accessGrant.findFirst({
            where: {
              userId,
              role: parsed.data.role,
              scopeType: parsed.data.scopeType,
              cityId,
              businessId,
            },
            select: {
              id: true,
            },
          });

          if (duplicate) {
            throw new Error("DUPLICATE_ACCESS_GRANT");
          }

          const createdGrant = await tx.accessGrant.create({
            data: {
              userId,
              role: parsed.data.role,
              scopeType: parsed.data.scopeType,
              cityId,
              businessId,
              active: parsed.data.active,
              createdByUserId: auth.user.id,
            },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  phone: true,
                  status: true,
                  lastLoginAt: true,
                },
              },
              city: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                },
              },
              business: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                  city: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      status: true,
                    },
                  },
                },
              },
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: auth.user.id,
              action: "platform.access_grant.created",
              targetType: "access_grant",
              targetId: createdGrant.id,
              scopeType: parsed.data.scopeType,
              cityId,
              businessId,
              metadataJson: {
                role: parsed.data.role,
                userId,
              },
            },
          });

          return createdGrant;
        });

        return reply.code(201).send({
          status: "ok",
          item: mapAccessGrant(accessGrant),
        });
      } catch (error) {
        if (error instanceof Error && error.message === "USER_NOT_FOUND") {
          return reply.code(404).send({
            status: "error",
            error: "User not found",
          });
        }

        if (error instanceof Error && error.message === "USER_NOT_RESOLVED") {
          return reply.code(400).send({
            status: "error",
            error: "Unable to resolve the target user",
          });
        }

        if (error instanceof Error && error.message === "DUPLICATE_ACCESS_GRANT") {
          return reply.code(409).send({
            status: "error",
            error: "This user already has the requested access grant",
          });
        }

        throw error;
      }
    },
  );
}
