import { Prisma } from "@prisma/client";

import type {
  AccessRole,
  BusinessPlan,
  BusinessStatus,
  CityStatus,
  ModuleCode,
  ScopeType,
  SubscriptionStatus,
  TemplateCategory,
  UserStatus,
} from "./config.js";

export function mapCity(city: {
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
    categories?: number;
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
    activeCategoryCount: city._count?.categories ?? 0,
    createdAt: city.createdAt,
    updatedAt: city.updatedAt,
  };
}

export function mapCityRegistryEntry(entry: {
  id: string;
  name: string;
  asciiName: string | null;
  slug: string;
  externalId: string | null;
  alternateNames: string | null;
  provinceCode: string | null;
  provinceName: string | null;
  regionCode: string | null;
  regionName: string | null;
  admin1Code: string | null;
  admin1Name: string | null;
  admin2Code: string | null;
  admin2Name: string | null;
  admin3Code: string | null;
  admin4Code: string | null;
  country: string;
  countryName: string | null;
  istatCode: string | null;
  cadastralCode: string | null;
  featureClass: string | null;
  featureCode: string | null;
  population: number | null;
  timezone: string | null;
  source: string | null;
  sourceVersion: string | null;
  sourceModifiedAt: Date | null;
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
    asciiName: entry.asciiName,
    slug: entry.slug,
    externalId: entry.externalId,
    alternateNames: entry.alternateNames,
    provinceCode: entry.provinceCode,
    provinceName: entry.provinceName,
    regionCode: entry.regionCode,
    regionName: entry.regionName,
    admin1Code: entry.admin1Code,
    admin1Name: entry.admin1Name,
    admin2Code: entry.admin2Code,
    admin2Name: entry.admin2Name,
    admin3Code: entry.admin3Code,
    admin4Code: entry.admin4Code,
    country: entry.country,
    countryName: entry.countryName,
    istatCode: entry.istatCode,
    cadastralCode: entry.cadastralCode,
    featureClass: entry.featureClass,
    featureCode: entry.featureCode,
    population: entry.population,
    timezone: entry.timezone,
    source: entry.source,
    sourceVersion: entry.sourceVersion,
    sourceModifiedAt: entry.sourceModifiedAt,
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

export function mapBusiness(business: {
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
  locality: string | null;
  province: string | null;
  lat: number | null;
  lng: number | null;
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
  socialLinksJson: Prisma.JsonValue | null;
  privacyContactEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
  city: {
    id: string;
    name: string;
    slug: string;
    status: CityStatus;
    active: boolean;
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
    locality: business.locality,
    province: business.province,
    lat: business.lat,
    lng: business.lng,
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
    socialLinks: business.socialLinksJson,
    privacyContactEmail: business.privacyContactEmail,
    city: business.city,
    template: business.template,
    modules: business.modules,
    owner: business.ownerUser,
    createdAt: business.createdAt,
    updatedAt: business.updatedAt,
  };
}

export function mapPublicCity(city: {
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

export function mapPublicEvent(event: {
  id: string;
  cityId: string;
  title: string;
  slug: string;
  summary: string;
  description: string | null;
  organizerName: string;
  venueName: string;
  addressLine1: string | null;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  status: "draft" | "in_review" | "published" | "archived";
  organizerBusiness: {
    cityId: string;
    name: string;
    slug: string;
    status: BusinessStatus;
  } | null;
}) {
  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    summary: event.summary,
    description: event.description,
    status: event.status,
    venueName: event.venueName,
    addressLine1: event.addressLine1,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    timezone: event.timezone,
    organizer: {
      name: event.organizerName,
      businessSlug:
        event.organizerBusiness?.status === "active" &&
        event.organizerBusiness.cityId === event.cityId
          ? event.organizerBusiness.slug
          : null,
    },
  };
}

export function mapPublicBusiness(business: {
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
  locality: string | null;
  province: string | null;
  socialLinksJson: Prisma.JsonValue | null;
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
    active: boolean;
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
  categoryAssignments: Array<{
    sortOrder: number;
    category: {
      id: string;
      cityId: string;
      name: string;
      slug: string;
    };
  }>;
  services: Array<{
    name: string;
    shortDescription: string | null;
    description: string | null;
  }>;
}) {
  const categories = business.categoryAssignments
    .filter((assignment) => assignment.category.cityId === business.city.id)
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.category.name.localeCompare(right.category.name, "it"),
    )
    .map(({ category }) => ({ id: category.id, name: category.name, slug: category.slug }));

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
    locality: business.locality,
    province: business.province,
    socialLinks: business.socialLinksJson,
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
    categories,
    serviceNames: business.services.map((service) => service.name),
    serviceSearchTerms: business.services.flatMap((service) =>
      [service.name, service.shortDescription, service.description].filter((term): term is string =>
        Boolean(term),
      ),
    ),
    createdAt: business.createdAt,
    updatedAt: business.updatedAt,
  };
}

export function mapAccessGrant(grant: {
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

export function mapAuditLog(log: {
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
