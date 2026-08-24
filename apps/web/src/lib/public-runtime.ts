import { buildBusinessPath, buildCityPath } from "@platform/domain";
import { getTemplateDefinition, MODULE_DEFINITIONS } from "@platform/templates";
import { cache } from "react";
import {
  fetchPlatformApi,
  type PublicBusinessResponse,
  type PublicBusinessCategory,
  type PublicBusinessServicesResponse,
  type PublicPickupOrderMenuResponse,
  type PublicOpeningHoursResponse,
  type PublicCityResponse,
  type PublicPlatformBusiness,
  type PublicPlatformCity,
  PlatformApiError,
} from "./platform-api";
import { normalizeExternalUrl } from "./public-links";
import { shouldUseEditorialFallback } from "./public-runtime-policy";
import {
  getBusinessProfile,
  getCityProfile,
  getFallbackBusinessProfile,
  getFallbackCityProfile,
  getFeaturedCities,
  type PublicBusinessProfile,
  type PublicCityProfile,
} from "./public-marketplace";
import { getPublicBusinessCategoryLabel } from "./public-search";

export type HomepageCityCard = {
  name: string;
  slug: string;
  searchQualifier?: string | null;
  claim: string;
  shortPitch: string;
  businessCount: number;
  href: string;
};

export type PublicCityBusinessCard = PublicBusinessProfile & {
  href: string;
  category: string | null;
  categories: PublicBusinessCategory[];
  searchTerms: string[];
  services: string[];
};

type PublicBusinessDetail = PublicBusinessProfile & {
  href: string;
  moduleLabel: string;
  socialLinks: Array<{ label: string; url: string }>;
  locality: string | null;
  province: string | null;
  publicEmail: string | null;
  website: string | null;
  currency: string;
  categories: PublicBusinessCategory[];
  addressLine2: string | null;
  postalCode: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

const socialLabels = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["linkedin", "LinkedIn"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
] as const;

function mapSocialLinks(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const socialLinks = value as Record<string, unknown>;
  const seen = new Set<string>();
  return socialLabels.flatMap(([key, label]) => {
    const candidate = socialLinks[key];
    const url = normalizeExternalUrl(typeof candidate === "string" ? candidate : null);
    if (!url || seen.has(url)) return [];
    seen.add(url);
    return [{ label, url }];
  });
}

export type HomepageSurfaceData = {
  featuredCities: HomepageCityCard[];
  degraded: boolean;
};

export type PublicCitySurfaceData = {
  city: Omit<PublicCityProfile, "businesses"> & {
    country: string;
    businessCount: number;
    businesses: PublicCityBusinessCard[];
    publicHeroTitle: string | null;
    publicHeroDescription: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
  };
  degraded: boolean;
  live: boolean;
};

export type PublicBusinessSurfaceData = {
  city: PublicCityProfile & { country: string };
  business: PublicBusinessDetail;
  degraded: boolean;
  live: boolean;
};

export type PublicCityMetadataData = {
  city: Pick<
    PublicPlatformCity,
    "name" | "slug" | "heroDescription" | "seoTitle" | "seoDescription"
  >;
  degraded: boolean;
};

export type PublicBusinessMetadataData = {
  business: Pick<PublicBusinessDetail, "name" | "slug" | "summary" | "seoTitle" | "seoDescription">;
  citySlug: string;
  degraded: boolean;
};

export async function getPublicBusinessServices(citySlug: string, businessSlug: string) {
  return fetchPlatformApi<PublicBusinessServicesResponse>(
    `/api/v2/public/cities/${citySlug}/businesses/${businessSlug}/services`,
  );
}

export async function getPublicBusinessOpeningHours(citySlug: string, businessSlug: string) {
  return fetchPlatformApi<PublicOpeningHoursResponse>(
    `/api/v2/public/cities/${citySlug}/businesses/${businessSlug}/opening-hours`,
  );
}

export async function getPublicPickupOrderMenu(citySlug: string, businessSlug: string) {
  return fetchPlatformApi<PublicPickupOrderMenuResponse>(
    `/api/v2/public/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/orders/menu`,
  );
}

async function fetchAllPublicPages<TItem>(path: string) {
  const limit = 24;
  const items: TItem[] = [];

  for (let page = 1; page <= 100; page += 1) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await fetchPlatformApi<{
      status: "ok";
      items: TItem[];
      page: number;
      limit: number;
      total: number;
    }>(`${path}${separator}page=${page}&limit=${limit}`);
    items.push(...response.items);

    if (items.length >= response.total || response.items.length < limit) {
      return items;
    }
  }

  return items;
}

export async function getPublicSitemapData() {
  const [cities, businesses] = await Promise.all([
    fetchAllPublicPages<PublicPlatformCity>("/api/v2/public/cities"),
    fetchAllPublicPages<PublicPlatformBusiness>("/api/v2/public/businesses"),
  ]);

  return {
    cities: cities.map((city) => ({ slug: city.slug })),
    businesses: businesses.map((business) => ({
      citySlug: business.city.slug,
      businessSlug: business.slug,
      updatedAt: business.updatedAt,
    })),
  };
}

function getModuleLabel(code: string) {
  return MODULE_DEFINITIONS.find((entry) => entry.code === code)?.label ?? code;
}

function canonicalCitySlug(citySlug: string) {
  return citySlug;
}

function canonicalBusinessSlug(_citySlug: string, businessSlug: string) {
  return businessSlug;
}

function buildCityCandidates(citySlug: string) {
  return [canonicalCitySlug(citySlug)];
}

function buildBusinessCandidates(citySlug: string, businessSlug: string) {
  return [
    {
      citySlug: canonicalCitySlug(citySlug),
      businessSlug: canonicalBusinessSlug(citySlug, businessSlug),
    },
  ];
}

function sanitizeLegacyLink(value: string | null) {
  if (!value) {
    return null;
  }

  return /\.(?:test|example)(?:[/:]|$)/i.test(value) ? null : value;
}

function normalizeRuntimeCity(city: PublicPlatformCity): PublicPlatformCity {
  return city;
}

function normalizeRuntimeBusiness(business: PublicPlatformBusiness): PublicPlatformBusiness {
  return {
    ...business,
    categories: Array.isArray(business.categories) ? business.categories : [],
    serviceNames: Array.isArray(business.serviceNames) ? business.serviceNames : [],
    serviceSearchTerms: Array.isArray(business.serviceSearchTerms)
      ? business.serviceSearchTerms
      : [],
    publicEmail: sanitizeLegacyLink(business.publicEmail),
    website: sanitizeLegacyLink(business.website),
  };
}

const fetchPublicCityItem = cache(async (citySlug: string) => {
  const response = await fetchPlatformApi<PublicCityResponse>(
    `/api/v2/public/cities/${encodeURIComponent(citySlug)}`,
  );
  return normalizeRuntimeCity(response.item);
});

const fetchPublicBusinessItem = cache(async (citySlug: string, businessSlug: string) => {
  const response = await fetchPlatformApi<PublicBusinessResponse>(
    `/api/v2/public/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}`,
  );
  return normalizeRuntimeBusiness(response.item);
});

export function chooseHomepageCityCards(
  liveCities: HomepageCityCard[],
  fallbackCities: HomepageCityCard[],
  degraded: boolean,
) {
  return degraded ? fallbackCities : liveCities;
}

export function formatPublicBusinessLocation({
  addressLine,
  addressLine2,
  postalCode,
  locality,
  province,
}: {
  addressLine: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  locality: string | null;
  province: string | null;
}) {
  const postalLocality = [postalCode, locality]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");

  return [addressLine, addressLine2, postalLocality, province]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(", ");
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

export function getPublicBusinessDisplayName(
  business: Pick<PublicPlatformBusiness, "name" | "publicTitle">,
) {
  return business.publicTitle?.trim() || business.name;
}

function pickBusinessModuleCode(business: PublicPlatformBusiness) {
  return (
    business.modules.find(
      (entry) => entry.active && entry.moduleCode === business.template.primaryModule,
    )?.moduleCode ??
    business.modules.find((entry) => entry.active)?.moduleCode ??
    business.template.primaryModule
  );
}

function mergeRuntimeBusinessWithEditorial(
  business: PublicPlatformBusiness,
  editorialBusiness: PublicBusinessProfile,
): PublicBusinessDetail {
  const moduleCode = pickBusinessModuleCode(business);
  const summary =
    business.publicSubtitle ??
    business.publicDescription ??
    "Questa attività non ha ancora pubblicato una descrizione.";
  const addressLine = business.addressLine1 ?? "";
  const categoryLabel = business.categories.length
    ? business.categories.map((category) => category.name).join(" · ")
    : (getPublicBusinessCategoryLabel(business.template.category) ?? business.template.name);

  return {
    ...editorialBusiness,
    name: getPublicBusinessDisplayName(business),
    slug: business.slug,
    citySlug: business.city.slug,
    templateCode: business.template.code as PublicBusinessProfile["templateCode"],
    moduleCode: moduleCode as PublicBusinessProfile["moduleCode"],
    categoryLabel,
    summary: truncateText(summary, 180),
    area: business.addressLine1 ?? "",
    trustLine: business.publicDescription ? truncateText(business.publicDescription, 180) : "",
    contactPhone: business.publicPhone ?? "",
    addressLine,
    href: buildBusinessPath({
      citySlug: business.city.slug,
      businessSlug: business.slug,
    }),
    moduleLabel: getModuleLabel(moduleCode),
    socialLinks: mapSocialLinks(business.socialLinks),
    locality: business.locality,
    province: business.province,
    addressLine2: business.addressLine2,
    postalCode: business.postalCode,
    publicEmail: business.publicEmail,
    website: business.website,
    currency: business.currency,
    categories: business.categories,
    seoTitle: business.seoTitle,
    seoDescription: business.seoDescription,
  };
}

function mergeRuntimeCityWithEditorial(
  city: PublicPlatformCity,
  businesses: PublicPlatformBusiness[],
  editorialCity: PublicCityProfile,
  searchTermsByBusiness = new Map<string, string[]>(),
  serviceNamesByBusiness = new Map<string, string[]>(),
): PublicCitySurfaceData["city"] {
  return {
    ...editorialCity,
    name: city.name,
    slug: city.slug,
    country: city.country,
    region: city.region ?? editorialCity.region,
    claim: city.heroTitle ?? editorialCity.claim,
    shortPitch: city.heroDescription ?? editorialCity.shortPitch,
    businessCount: city.businessCount,
    publicHeroTitle: city.heroTitle,
    publicHeroDescription: city.heroDescription,
    seoTitle: city.seoTitle,
    seoDescription: city.seoDescription,
    businesses: businesses.map((business) => {
      const editorialBusiness = getBusinessProfile(city.slug, business.slug);
      const merged = mergeRuntimeBusinessWithEditorial(business, editorialBusiness);

      return {
        ...merged,
        category: business.template.category,
        categories: business.categories,
        searchTerms: searchTermsByBusiness.get(business.id) ?? [],
        services: serviceNamesByBusiness.get(business.id) ?? [],
      };
    }),
  };
}

function mapHomeCity(city: PublicPlatformCity): HomepageCityCard {
  return {
    name: city.name,
    slug: city.slug,
    searchQualifier: [city.province, city.region]
      .filter(
        (value, index, values): value is string =>
          Boolean(value) && values.indexOf(value) === index,
      )
      .join(" · "),
    claim: city.heroTitle ?? `Scopri le attività pubblicate a ${city.name}.`,
    shortPitch: city.heroDescription ?? "Scegli una città per esplorarne la directory locale.",
    businessCount: city.businessCount,
    href: buildCityPath(city.slug),
  };
}

export async function getPublicCityMetadataData(
  citySlug: string,
): Promise<PublicCityMetadataData | null> {
  const canonicalSlug = canonicalCitySlug(citySlug);

  try {
    return {
      city: await fetchPublicCityItem(canonicalSlug),
      degraded: false,
    };
  } catch (error) {
    if (error instanceof PlatformApiError && error.status === 404) return null;
    if (!shouldUseEditorialFallback()) throw error;

    const fallbackCity = getFallbackCityProfile(canonicalSlug);
    return fallbackCity
      ? {
          city: {
            name: fallbackCity.name,
            slug: fallbackCity.slug,
            heroDescription: null,
            seoTitle: null,
            seoDescription: null,
          },
          degraded: true,
        }
      : null;
  }
}

export async function getPublicBusinessMetadataData(
  citySlug: string,
  businessSlug: string,
): Promise<PublicBusinessMetadataData | null> {
  const canonicalCity = canonicalCitySlug(citySlug);
  const canonicalBusiness = canonicalBusinessSlug(citySlug, businessSlug);

  try {
    const runtimeBusiness = await fetchPublicBusinessItem(canonicalCity, canonicalBusiness);
    const business = mergeRuntimeBusinessWithEditorial(
      runtimeBusiness,
      getBusinessProfile(canonicalCity, canonicalBusiness),
    );
    return { business, citySlug: runtimeBusiness.city.slug, degraded: false };
  } catch (error) {
    if (error instanceof PlatformApiError && error.status === 404) return null;
    if (!shouldUseEditorialFallback()) throw error;

    const fallbackBusiness = getFallbackBusinessProfile(canonicalCity, canonicalBusiness);
    return fallbackBusiness
      ? {
          business: {
            name: fallbackBusiness.name,
            slug: fallbackBusiness.slug,
            summary: fallbackBusiness.summary,
            seoTitle: null,
            seoDescription: null,
          },
          citySlug: canonicalCity,
          degraded: true,
        }
      : null;
  }
}

export async function getHomepageSurfaceData(): Promise<HomepageSurfaceData> {
  const fallbackCities = getFeaturedCities().map((city) => ({
    name: city.name,
    slug: city.slug,
    searchQualifier: city.region,
    claim: city.claim,
    shortPitch: city.shortPitch,
    businessCount: city.businesses.length,
    href: buildCityPath(city.slug),
  }));
  try {
    const runtimeCities = (
      await fetchAllPublicPages<PublicPlatformCity>("/api/v2/public/cities")
    ).map(normalizeRuntimeCity);
    const featuredCities = chooseHomepageCityCards(
      runtimeCities.map(mapHomeCity),
      fallbackCities,
      false,
    );

    return {
      featuredCities,
      degraded: false,
    };
  } catch (error) {
    if (!shouldUseEditorialFallback()) throw error;

    return {
      featuredCities: chooseHomepageCityCards([], fallbackCities, true),
      degraded: true,
    };
  }
}

export async function getPublicCitySurfaceData(
  citySlug: string,
): Promise<PublicCitySurfaceData | null> {
  const canonicalSlug = canonicalCitySlug(citySlug);
  const editorialCity = getCityProfile(canonicalSlug);

  try {
    let lastError: unknown;

    for (const candidateSlug of buildCityCandidates(citySlug)) {
      try {
        const [runtimeCity, businesses] = await Promise.all([
          fetchPublicCityItem(candidateSlug),
          fetchAllPublicPages<PublicPlatformBusiness>(
            `/api/v2/public/cities/${candidateSlug}/businesses`,
          ),
        ]);
        const runtimeBusinesses = businesses.map(normalizeRuntimeBusiness);
        const searchTermsByBusiness = new Map(
          runtimeBusinesses.map((business) => [business.id, business.serviceSearchTerms]),
        );
        const serviceNamesByBusiness = new Map(
          runtimeBusinesses.map((business) => [business.id, business.serviceNames]),
        );

        return {
          city: mergeRuntimeCityWithEditorial(
            runtimeCity,
            runtimeBusinesses,
            editorialCity,
            searchTermsByBusiness,
            serviceNamesByBusiness,
          ),
          degraded: false,
          live: true,
        };
      } catch (error) {
        lastError = error;

        if (!(error instanceof PlatformApiError) || error.status !== 404) {
          throw error;
        }
      }
    }

    if (lastError instanceof PlatformApiError && lastError.status === 404) {
      return null;
    }

    throw lastError;
  } catch (error) {
    if (error instanceof PlatformApiError && error.status === 404) {
      return null;
    }
    if (!shouldUseEditorialFallback()) throw error;

    const fallbackCity = getFallbackCityProfile(canonicalSlug);

    if (!fallbackCity) {
      return null;
    }

    return {
      city: {
        ...fallbackCity,
        country: "IT",
        businessCount: fallbackCity.businesses.length,
        publicHeroTitle: null,
        publicHeroDescription: null,
        seoTitle: null,
        seoDescription: null,
        businesses: fallbackCity.businesses.map((business) => ({
          ...business,
          href: buildBusinessPath({
            citySlug: business.citySlug,
            businessSlug: business.slug,
          }),
          category: getTemplateDefinition(business.templateCode)?.category ?? null,
          categories: [],
          searchTerms: [],
          services: [],
        })),
      },
      degraded: true,
      live: false,
    };
  }
}

export async function getPublicBusinessSurfaceData(
  citySlug: string,
  businessSlug: string,
): Promise<PublicBusinessSurfaceData | null> {
  const canonicalCity = canonicalCitySlug(citySlug);
  const canonicalBusiness = canonicalBusinessSlug(citySlug, businessSlug);
  const editorialCity = getCityProfile(canonicalCity);
  const editorialBusiness = getBusinessProfile(canonicalCity, canonicalBusiness);

  try {
    let lastError: unknown;

    for (const candidate of buildBusinessCandidates(citySlug, businessSlug)) {
      try {
        const [runtimeCity, runtimeBusiness] = await Promise.all([
          fetchPublicCityItem(candidate.citySlug),
          fetchPublicBusinessItem(candidate.citySlug, candidate.businessSlug),
        ]);

        return {
          city: {
            ...editorialCity,
            name: runtimeCity.name,
            slug: runtimeCity.slug,
            country: runtimeCity.country,
            region: runtimeCity.region ?? editorialCity.region,
            claim: runtimeCity.heroTitle ?? editorialCity.claim,
            shortPitch: runtimeCity.heroDescription ?? editorialCity.shortPitch,
          },
          business: mergeRuntimeBusinessWithEditorial(runtimeBusiness, editorialBusiness),
          degraded: false,
          live: true,
        };
      } catch (error) {
        lastError = error;

        if (!(error instanceof PlatformApiError) || error.status !== 404) {
          throw error;
        }
      }
    }

    if (lastError instanceof PlatformApiError && lastError.status === 404) {
      return null;
    }

    throw lastError;
  } catch (error) {
    if (error instanceof PlatformApiError && error.status === 404) {
      return null;
    }
    if (!shouldUseEditorialFallback()) throw error;

    const fallbackCity = getFallbackCityProfile(canonicalCity);
    const fallbackBusiness = getFallbackBusinessProfile(canonicalCity, canonicalBusiness);

    if (!fallbackCity || !fallbackBusiness) {
      return null;
    }

    return {
      city: { ...fallbackCity, country: "IT" },
      business: {
        ...fallbackBusiness,
        href: buildBusinessPath({
          citySlug: fallbackBusiness.citySlug,
          businessSlug: fallbackBusiness.slug,
        }),
        moduleLabel: getModuleLabel(fallbackBusiness.moduleCode),
        socialLinks: [],
        locality: null,
        province: null,
        addressLine2: null,
        postalCode: null,
        publicEmail: null,
        website: null,
        currency: "EUR",
        categories: [],
        seoTitle: null,
        seoDescription: null,
      },
      degraded: true,
      live: false,
    };
  }
}
