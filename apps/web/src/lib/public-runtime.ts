import { buildBusinessPath, buildCityPath } from "@platform/shared";
import { getTemplateDefinition, MODULE_DEFINITIONS } from "@platform/templates";
import {
  fetchPlatformApi,
  type PublicBusinessResponse,
  type PublicBusinessServicesResponse,
  type PublicPickupOrderMenuResponse,
  type PublicOpeningHoursResponse,
  type PublicCityResponse,
  type PublicPlatformBusiness,
  type PublicPlatformCity,
  PlatformApiError,
} from "./platform-api";
import { normalizeExternalUrl } from "./public-links";
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
  claim: string;
  shortPitch: string;
  businessCount: number;
  href: string;
};

export type PublicCityBusinessCard = PublicBusinessProfile & {
  href: string;
  category: string | null;
  searchTerms: string[];
  services: string[];
};

export type PublicBusinessDetail = PublicBusinessProfile & {
  href: string;
  moduleLabel: string;
  socialLinks: Array<{ label: string; url: string }>;
  locality: string | null;
  province: string | null;
  publicEmail: string | null;
  website: string | null;
  currency: string;
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
    businessCount: number;
    businesses: PublicCityBusinessCard[];
    publicHeroTitle: string | null;
    publicHeroDescription: string | null;
  };
  degraded: boolean;
  live: boolean;
};

export type PublicBusinessSurfaceData = {
  city: PublicCityProfile;
  business: PublicBusinessDetail;
  degraded: boolean;
  live: boolean;
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
    publicEmail: sanitizeLegacyLink(business.publicEmail),
    website: sanitizeLegacyLink(business.website),
  };
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
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

  return {
    ...editorialBusiness,
    name: business.name,
    slug: business.slug,
    citySlug: business.city.slug,
    templateCode: business.template.code as PublicBusinessProfile["templateCode"],
    moduleCode: moduleCode as PublicBusinessProfile["moduleCode"],
    categoryLabel:
      getPublicBusinessCategoryLabel(business.template.category) ?? business.template.name,
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
    publicEmail: business.publicEmail,
    website: business.website,
    currency: business.currency,
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
    region: city.region ?? editorialCity.region,
    claim: city.heroTitle ?? editorialCity.claim,
    shortPitch: city.heroDescription ?? editorialCity.shortPitch,
    businessCount: city.businessCount,
    publicHeroTitle: city.heroTitle,
    publicHeroDescription: city.heroDescription,
    businesses: businesses.map((business) => {
      const editorialBusiness = getBusinessProfile(city.slug, business.slug);
      const merged = mergeRuntimeBusinessWithEditorial(business, editorialBusiness);

      return {
        ...merged,
        category: business.template.category,
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
    claim: city.heroTitle ?? `Scopri le attività pubblicate a ${city.name}.`,
    shortPitch: city.heroDescription ?? "Scegli una città per esplorarne la directory locale.",
    businessCount: city.businessCount,
    href: buildCityPath(city.slug),
  };
}

export async function getHomepageSurfaceData(): Promise<HomepageSurfaceData> {
  const fallbackCities = getFeaturedCities().map((city) => ({
    name: city.name,
    slug: city.slug,
    claim: city.claim,
    shortPitch: city.shortPitch,
    businessCount: city.businesses.length,
    href: buildCityPath(city.slug),
  }));
  try {
    const runtimeCities = (
      await fetchAllPublicPages<PublicPlatformCity>("/api/v2/public/cities")
    ).map(normalizeRuntimeCity);
    const featuredCities =
      runtimeCities.length > 0 ? runtimeCities.map(mapHomeCity) : fallbackCities;

    return {
      featuredCities,
      degraded: false,
    };
  } catch {
    return {
      featuredCities: fallbackCities,
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
        const [cityResponse, businesses] = await Promise.all([
          fetchPlatformApi<PublicCityResponse>(`/api/v2/public/cities/${candidateSlug}`),
          fetchAllPublicPages<PublicPlatformBusiness>(
            `/api/v2/public/cities/${candidateSlug}/businesses`,
          ),
        ]);
        const runtimeCity = normalizeRuntimeCity(cityResponse.item);
        const runtimeBusinesses = businesses.map(normalizeRuntimeBusiness);
        const serviceResults = await Promise.allSettled(
          runtimeBusinesses.map((business) =>
            getPublicBusinessServices(runtimeCity.slug, business.slug),
          ),
        );
        const searchTermsByBusiness = new Map<string, string[]>();
        const serviceNamesByBusiness = new Map<string, string[]>();

        for (const [index, result] of serviceResults.entries()) {
          if (result.status !== "fulfilled") continue;

          const business = runtimeBusinesses[index];
          if (!business) continue;

          searchTermsByBusiness.set(
            business.id,
            result.value.items.flatMap((service) =>
              [service.name, service.shortDescription, service.description].filter(
                (term): term is string => Boolean(term),
              ),
            ),
          );
          serviceNamesByBusiness.set(
            business.id,
            result.value.items.map((service) => service.name),
          );
        }

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

    const fallbackCity = getFallbackCityProfile(canonicalSlug);

    if (!fallbackCity) {
      return null;
    }

    return {
      city: {
        ...fallbackCity,
        businessCount: fallbackCity.businesses.length,
        publicHeroTitle: null,
        publicHeroDescription: null,
        businesses: fallbackCity.businesses.map((business) => ({
          ...business,
          href: buildBusinessPath({
            citySlug: business.citySlug,
            businessSlug: business.slug,
          }),
          category: getTemplateDefinition(business.templateCode)?.category ?? null,
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
        const [cityResponse, businessResponse] = await Promise.all([
          fetchPlatformApi<PublicCityResponse>(`/api/v2/public/cities/${candidate.citySlug}`),
          fetchPlatformApi<PublicBusinessResponse>(
            `/api/v2/public/cities/${candidate.citySlug}/businesses/${candidate.businessSlug}`,
          ),
        ]);
        const runtimeCity = normalizeRuntimeCity(cityResponse.item);
        const runtimeBusiness = normalizeRuntimeBusiness(businessResponse.item);

        return {
          city: {
            ...editorialCity,
            name: runtimeCity.name,
            slug: runtimeCity.slug,
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

    const fallbackCity = getFallbackCityProfile(canonicalCity);
    const fallbackBusiness = getFallbackBusinessProfile(canonicalCity, canonicalBusiness);

    if (!fallbackCity || !fallbackBusiness) {
      return null;
    }

    return {
      city: fallbackCity,
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
        publicEmail: null,
        website: null,
        currency: "EUR",
      },
      degraded: true,
      live: false,
    };
  }
}
