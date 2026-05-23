import { buildBusinessPath, buildCityPath } from "@platform/shared";
import { MODULE_DEFINITIONS } from "@platform/templates";
import {
  fetchPlatformApi,
  type PublicBusinessResponse,
  type PublicBusinessesResponse,
  type PublicCityResponse,
  type PublicCitiesResponse,
  type PublicPlatformBusiness,
  type PublicPlatformCity,
  PlatformApiError,
} from "./platform-api";
import {
  getBusinessProfile,
  getCityProfile,
  getFeaturedCities,
  getHomepageShowcase,
  type PublicBusinessProfile,
  type PublicCityProfile,
} from "./public-marketplace";

type ActionLink = {
  label: string;
  href: string;
};

export type HomepageCityCard = {
  name: string;
  slug: string;
  claim: string;
  shortPitch: string;
  businessCount: number;
  href: string;
};

export type HomepageBusinessCard = {
  name: string;
  slug: string;
  citySlug: string;
  cityName: string;
  categoryLabel: string;
  summary: string;
  area: string;
  eta: string;
  vibe: string;
  trustLine: string;
  href: string;
  cityHref: string;
};

export type PublicCityBusinessCard = PublicBusinessProfile & {
  href: string;
  contactLabel: string;
  contactHref: string;
};

export type PublicBusinessDetail = PublicBusinessProfile & {
  href: string;
  moduleLabel: string;
  primaryAction: ActionLink;
  secondaryAction: ActionLink;
};

export type HomepageSurfaceData = {
  featuredCities: HomepageCityCard[];
  showcaseBusinesses: HomepageBusinessCard[];
  degraded: boolean;
  liveCities: boolean;
  liveBusinesses: boolean;
};

export type PublicCitySurfaceData = {
  city: Omit<PublicCityProfile, "businesses"> & {
    businessCount: number;
    businesses: PublicCityBusinessCard[];
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

  return /\.test(?:\/|$)/i.test(value) ? null : value;
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
    business.modules.find((entry) => entry.active)?.moduleCode ?? business.template.primaryModule
  );
}

function buildModuleEta(moduleCode: string) {
  switch (moduleCode) {
    case "booking":
      return "Disponibilita guidata";
    case "hospitality":
      return "Richiesta soggiorno";
    case "listings":
      return "Vetrina aggiornata";
    case "events":
      return "Agenda locale";
    case "catalog":
      return "Esplora il catalogo";
    default:
      return "Contatto diretto";
  }
}

function buildBusinessStatusLabel(business: PublicPlatformBusiness) {
  if (business.publicPhone) {
    return "Contatto diretto disponibile";
  }

  if (business.website) {
    return "Sito disponibile";
  }

  if (business.publicEmail) {
    return "Richiesta via email";
  }

  return "Scheda attiva";
}

function buildContactAction(business: PublicPlatformBusiness): ActionLink {
  if (business.publicPhone) {
    return {
      label: business.publicPhone,
      href: `tel:${business.publicPhone.replace(/[^\d+]/g, "")}`,
    };
  }

  if (business.website) {
    return {
      label: "Apri sito",
      href: business.website,
    };
  }

  if (business.publicEmail) {
    return {
      label: business.publicEmail,
      href: `mailto:${business.publicEmail}`,
    };
  }

  return {
    label: "Apri la scheda",
    href: buildBusinessPath({
      citySlug: business.city.slug,
      businessSlug: business.slug,
    }),
  };
}

function buildPrimaryAction(business: PublicPlatformBusiness): ActionLink {
  const contactAction = buildContactAction(business);
  const businessHref = buildBusinessPath({
    citySlug: business.city.slug,
    businessSlug: business.slug,
  });

  return {
    label: business.template.defaultCtaLabel ?? "Scopri di piu",
    href: contactAction.href === businessHref ? "#primary-action" : contactAction.href,
  };
}

function buildSecondaryAction(business: PublicPlatformBusiness): ActionLink {
  if (business.publicPhone) {
    return {
      label: "Chiama ora",
      href: `tel:${business.publicPhone.replace(/[^\d+]/g, "")}`,
    };
  }

  if (business.website) {
    return {
      label: "Apri sito",
      href: business.website,
    };
  }

  if (business.publicEmail) {
    return {
      label: "Scrivi ora",
      href: `mailto:${business.publicEmail}`,
    };
  }

  return {
    label: `Torna a ${business.city.name}`,
    href: buildCityPath(business.city.slug),
  };
}

function mergeRuntimeBusinessWithEditorial(
  business: PublicPlatformBusiness,
  editorialBusiness: PublicBusinessProfile,
): PublicBusinessDetail {
  const moduleCode = pickBusinessModuleCode(business);
  const summary =
    business.publicSubtitle ?? business.publicDescription ?? editorialBusiness.summary;
  const trustLine = business.publicDescription ?? editorialBusiness.trustLine;
  const addressLine = business.addressLine1 ?? editorialBusiness.addressLine;
  const primaryAction = buildPrimaryAction(business);
  const secondaryAction = buildSecondaryAction(business);

  return {
    ...editorialBusiness,
    name: business.name,
    slug: business.slug,
    citySlug: business.city.slug,
    templateCode: business.template.code as PublicBusinessProfile["templateCode"],
    moduleCode: moduleCode as PublicBusinessProfile["moduleCode"],
    categoryLabel: business.template.name,
    summary: truncateText(summary, 180),
    area: business.addressLine1 ?? editorialBusiness.area,
    eta: buildModuleEta(moduleCode),
    vibe: business.publicTitle ?? editorialBusiness.vibe,
    trustLine: truncateText(trustLine, 180),
    priceHint: getModuleLabel(moduleCode),
    contactPhone: business.publicPhone ?? editorialBusiness.contactPhone,
    addressLine,
    openNowLabel: buildBusinessStatusLabel(business),
    heroTitle: business.publicTitle ?? editorialBusiness.heroTitle,
    heroDescription: business.publicDescription ?? editorialBusiness.heroDescription,
    ctaPrimary: business.template.defaultCtaLabel ?? editorialBusiness.ctaPrimary,
    highlights:
      editorialBusiness.highlights.length > 0
        ? editorialBusiness.highlights
        : [business.template.name, getModuleLabel(moduleCode), business.city.name],
    serviceMoments:
      editorialBusiness.serviceMoments.length > 0
        ? editorialBusiness.serviceMoments
        : ["Scelta rapida", "Contatto", "Prossimo passo chiaro"],
    faq:
      editorialBusiness.faq.length > 0
        ? editorialBusiness.faq
        : [
            {
              question: "Come si contatta questa attivita?",
              answer:
                business.publicPhone ??
                business.publicEmail ??
                business.website ??
                "Dalla CTA principale o dalla sezione informazioni pratiche.",
            },
            {
              question: "Ci sono informazioni pratiche gia visibili?",
              answer:
                business.bookingPolicy ??
                business.cancellationPolicy ??
                "La scheda evidenzia contatti, posizione e prossimi passi essenziali.",
            },
          ],
    href: buildBusinessPath({
      citySlug: business.city.slug,
      businessSlug: business.slug,
    }),
    moduleLabel: getModuleLabel(moduleCode),
    primaryAction,
    secondaryAction,
  };
}

function mergeRuntimeCityWithEditorial(
  city: PublicPlatformCity,
  businesses: PublicPlatformBusiness[],
  editorialCity: PublicCityProfile,
): PublicCitySurfaceData["city"] {
  return {
    ...editorialCity,
    name: city.name,
    slug: city.slug,
    region: city.region ?? editorialCity.region,
    claim: city.heroTitle ?? editorialCity.claim,
    shortPitch: city.heroDescription ?? editorialCity.shortPitch,
    businessCount: city.businessCount,
    businesses: businesses.map((business) => {
      const editorialBusiness = getBusinessProfile(city.slug, business.slug);
      const merged = mergeRuntimeBusinessWithEditorial(business, editorialBusiness);

      return {
        ...merged,
        contactLabel: buildContactAction(business).label,
        contactHref: buildContactAction(business).href,
      };
    }),
  };
}

function mapHomeCity(city: PublicPlatformCity): HomepageCityCard {
  const editorialCity = getCityProfile(city.slug);

  return {
    name: city.name,
    slug: city.slug,
    claim: city.heroTitle ?? editorialCity.claim,
    shortPitch: city.heroDescription ?? editorialCity.shortPitch,
    businessCount: city.businessCount,
    href: buildCityPath(city.slug),
  };
}

function mapHomeBusiness(business: PublicPlatformBusiness): HomepageBusinessCard {
  const editorialBusiness = getBusinessProfile(business.city.slug, business.slug);
  const merged = mergeRuntimeBusinessWithEditorial(business, editorialBusiness);

  return {
    name: merged.name,
    slug: merged.slug,
    citySlug: merged.citySlug,
    cityName: business.city.name,
    categoryLabel: merged.categoryLabel,
    summary: merged.summary,
    area: merged.area,
    eta: merged.eta,
    vibe: merged.vibe,
    trustLine: merged.trustLine,
    href: merged.href,
    cityHref: buildCityPath(business.city.slug),
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
  const fallbackBusinesses = getHomepageShowcase().map((business) => ({
    name: business.name,
    slug: business.slug,
    citySlug: business.citySlug,
    cityName: business.cityName,
    categoryLabel: business.categoryLabel,
    summary: business.summary,
    area: business.area,
    eta: business.eta,
    vibe: business.vibe,
    trustLine: business.trustLine,
    href: business.href,
    cityHref: business.cityHref,
  }));

  try {
    const [citiesResponse, businessesResponse] = await Promise.all([
      fetchPlatformApi<PublicCitiesResponse>("/api/v2/public/cities?limit=6"),
      fetchPlatformApi<PublicBusinessesResponse>("/api/v2/public/businesses?limit=6"),
    ]);
    const runtimeCities = citiesResponse.items.map(normalizeRuntimeCity);
    const runtimeBusinesses = businessesResponse.items.map(normalizeRuntimeBusiness);

    const featuredCities =
      runtimeCities.length > 0 ? runtimeCities.map(mapHomeCity) : fallbackCities;
    const showcaseBusinesses =
      runtimeBusinesses.length > 0 ? runtimeBusinesses.map(mapHomeBusiness) : fallbackBusinesses;

    return {
      featuredCities,
      showcaseBusinesses,
      degraded: false,
      liveCities: citiesResponse.items.length > 0,
      liveBusinesses: businessesResponse.items.length > 0,
    };
  } catch {
    return {
      featuredCities: fallbackCities,
      showcaseBusinesses: fallbackBusinesses,
      degraded: true,
      liveCities: false,
      liveBusinesses: false,
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
        const [cityResponse, businessesResponse] = await Promise.all([
          fetchPlatformApi<PublicCityResponse>(`/api/v2/public/cities/${candidateSlug}`),
          fetchPlatformApi<PublicBusinessesResponse>(
            `/api/v2/public/cities/${candidateSlug}/businesses?limit=12`,
          ),
        ]);
        const runtimeCity = normalizeRuntimeCity(cityResponse.item);
        const runtimeBusinesses = businessesResponse.items.map(normalizeRuntimeBusiness);

        return {
          city: mergeRuntimeCityWithEditorial(runtimeCity, runtimeBusinesses, editorialCity),
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

    return {
      city: {
        ...editorialCity,
        businessCount: editorialCity.businesses.length,
        businesses: editorialCity.businesses.map((business) => ({
          ...business,
          href: buildBusinessPath({
            citySlug: business.citySlug,
            businessSlug: business.slug,
          }),
          contactLabel: business.contactPhone,
          contactHref: `tel:${business.contactPhone.replace(/[^\d+]/g, "")}`,
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

    return {
      city: editorialCity,
      business: {
        ...editorialBusiness,
        href: buildBusinessPath({
          citySlug: editorialBusiness.citySlug,
          businessSlug: editorialBusiness.slug,
        }),
        moduleLabel: getModuleLabel(editorialBusiness.moduleCode),
        primaryAction: {
          label: editorialBusiness.ctaPrimary,
          href: "#primary-action",
        },
        secondaryAction: {
          label: editorialBusiness.ctaSecondary,
          href: `tel:${editorialBusiness.contactPhone.replace(/[^\d+]/g, "")}`,
        },
      },
      degraded: true,
      live: false,
    };
  }
}
