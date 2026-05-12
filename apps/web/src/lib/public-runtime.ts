import { buildBusinessPath, buildCityPath } from "@platform/shared";
import { MODULE_DEFINITIONS } from "@platform/templates";
import {
  fetchV2Api,
  type PublicBusinessResponse,
  type PublicBusinessesResponse,
  type PublicCityResponse,
  type PublicCitiesResponse,
  type PublicOrderingMenuResponse,
  type PublicPlatformBusiness,
  type PublicPlatformCity,
  V2ApiError,
} from "./v2-api";
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

export type PublicOrderingMenuPreview = {
  settings: {
    openingHours: string | null;
    openingDays: string[];
    openingTimeStart: string | null;
    openingTimeEnd: string | null;
    deliveryCost: number;
    minimumOrder: number;
    slotMinutes: number;
    maxOrdersPerSlot: number;
    minPreparationMinutes: number;
    closedDates: string[];
    specialDates: Array<{
      date: string;
      closed: boolean;
      openingTimeStart: string | null;
      openingTimeEnd: string | null;
      slotMinutes: number | null;
      maxOrdersPerSlot: number | null;
      minPreparationMinutes: number | null;
    }>;
    serviceZones: string[];
    customerMessage: string | null;
  };
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    items: Array<{
      id: string;
      name: string;
      description: string | null;
      price: number | null;
      emoji: string | null;
      featured: boolean;
    }>;
  }>;
};

function getModuleLabel(code: string) {
  return MODULE_DEFINITIONS.find((entry) => entry.code === code)?.label ?? code;
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
    case "ordering":
      return "Ordine rapido";
    case "appointments":
      return "Prenotazione in pochi tap";
    case "stays":
      return "Richiesta disponibilita";
    case "mobility_request":
      return "Risposta rapida";
    case "rentals":
      return "Noleggio guidato";
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

  return {
    label: business.template.defaultCtaLabel ?? "Scopri di piu",
    href:
      contactAction.href ===
      buildBusinessPath({
        citySlug: business.city.slug,
        businessSlug: business.slug,
      })
        ? "#primary-action"
        : contactAction.href,
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
    area: business.addressLine1 ?? business.city.name,
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
        : ["Scelta rapida", "Telefono", "Percorso diretto"],
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
      fetchV2Api<PublicCitiesResponse>("/api/v2/public/cities?limit=6"),
      fetchV2Api<PublicBusinessesResponse>("/api/v2/public/businesses?limit=6"),
    ]);

    const featuredCities =
      citiesResponse.items.length > 0 ? citiesResponse.items.map(mapHomeCity) : fallbackCities;
    const showcaseBusinesses =
      businessesResponse.items.length > 0
        ? businessesResponse.items.map(mapHomeBusiness)
        : fallbackBusinesses;

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
  const editorialCity = getCityProfile(citySlug);

  try {
    const [cityResponse, businessesResponse] = await Promise.all([
      fetchV2Api<PublicCityResponse>(`/api/v2/public/cities/${citySlug}`),
      fetchV2Api<PublicBusinessesResponse>(`/api/v2/public/cities/${citySlug}/businesses?limit=12`),
    ]);

    return {
      city: mergeRuntimeCityWithEditorial(
        cityResponse.item,
        businessesResponse.items,
        editorialCity,
      ),
      degraded: false,
      live: true,
    };
  } catch (error) {
    if (error instanceof V2ApiError && error.status === 404) {
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
  const editorialCity = getCityProfile(citySlug);
  const editorialBusiness = getBusinessProfile(citySlug, businessSlug);

  try {
    const [cityResponse, businessResponse] = await Promise.all([
      fetchV2Api<PublicCityResponse>(`/api/v2/public/cities/${citySlug}`),
      fetchV2Api<PublicBusinessResponse>(
        `/api/v2/public/cities/${citySlug}/businesses/${businessSlug}`,
      ),
    ]);

    return {
      city: {
        ...editorialCity,
        name: cityResponse.item.name,
        slug: cityResponse.item.slug,
        region: cityResponse.item.region ?? editorialCity.region,
        claim: cityResponse.item.heroTitle ?? editorialCity.claim,
        shortPitch: cityResponse.item.heroDescription ?? editorialCity.shortPitch,
      },
      business: mergeRuntimeBusinessWithEditorial(businessResponse.item, editorialBusiness),
      degraded: false,
      live: true,
    };
  } catch (error) {
    if (error instanceof V2ApiError && error.status === 404) {
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

export async function getPublicOrderingMenuPreview(citySlug: string, businessSlug: string) {
  try {
    const response = await fetchV2Api<PublicOrderingMenuResponse>(
      `/api/v2/ordering/public/${citySlug}/${businessSlug}/menu`,
    );

    const categories = response.categories
      .filter((category) => category.items.length > 0)
      .slice(0, 3)
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        items: category.items.slice(0, 4).map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          emoji: item.emoji,
          featured: item.featured,
        })),
      }));

    return {
      settings: response.settings,
      categories,
      live: true,
    } satisfies PublicOrderingMenuPreview & { live: boolean };
  } catch (error) {
    if (error instanceof V2ApiError && error.status === 404) {
      return {
        settings: {
          openingHours: null,
          openingDays: [],
          openingTimeStart: null,
          openingTimeEnd: null,
          deliveryCost: 0,
          minimumOrder: 0,
          slotMinutes: 15,
          maxOrdersPerSlot: 4,
          minPreparationMinutes: 30,
          closedDates: [],
          specialDates: [],
          serviceZones: [],
          customerMessage: null,
        },
        categories: [],
        live: false,
      } satisfies PublicOrderingMenuPreview & { live: boolean };
    }

    return {
      settings: {
        openingHours: null,
        openingDays: [],
        openingTimeStart: null,
        openingTimeEnd: null,
        deliveryCost: 0,
        minimumOrder: 0,
        slotMinutes: 15,
        maxOrdersPerSlot: 4,
        minPreparationMinutes: 30,
        closedDates: [],
        specialDates: [],
        serviceZones: [],
        customerMessage: null,
      },
      categories: [],
      live: false,
    } satisfies PublicOrderingMenuPreview & { live: boolean };
  }
}
