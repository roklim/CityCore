import {
  getCityProfile,
  getFeaturedCities,
  getHomepageShowcase,
} from "../../lib/public-marketplace";
import type { HomepageSurfaceData } from "../../lib/public-runtime";

export type HeroInsight = {
  label: string;
  value: string;
  detail: string;
};

export type CityPortal = {
  slug: string;
  name: string;
  region: string;
  summary: string;
  href: string;
  badge: string;
  activityLabel: string;
  tone: "emerald" | "violet" | "amber" | "rose";
};

export type CategoryShortcut = {
  title: string;
  description: string;
  href: string;
  icon: "discover" | "book" | "order" | "contact" | "manage";
};

export type EntryCategoryPreview = {
  title: string;
  href: string;
};

export type FeaturedBusiness = {
  slug: string;
  name: string;
  category: string;
  cityName: string;
  summary: string;
  href: string;
  rating: string;
  reviews: string;
  distance: string;
  badge?: string;
  tone: "cafe" | "fitness" | "garden" | "service" | "atelier";
};

export type FooterSection = {
  title: string;
  links: Array<{
    label: string;
    href: string;
  }>;
};

export type HomepageViewModel = {
  chooserLabel: string;
  degradedMessage: string;
  hero: {
    eyebrow: string;
    titleLine: string;
    accentLine: string;
    description: string;
    searchAria: string;
    searchPlaceholder: string;
    primaryCta: string;
    secondaryCta: string;
    trustTitle: string;
    trustDescription: string;
  };
  entry: {
    eyebrow: string;
    cityTitle: string;
    cityDescription: string;
    cityCta: string;
    cityControlLabel: string;
    categoryTitle: string;
    categoryDescription: string;
    categoryCta: string;
    categoryPreview: EntryCategoryPreview[];
  };
  citySection: {
    eyebrow: string;
    title: string;
    description: string;
    viewAll: string;
    viewAllHref: string;
  };
  categorySection: {
    eyebrow: string;
    title: string;
    description: string;
  };
  trustStrip: {
    eyebrow: string;
    title: string;
    items: string[];
  };
  businessSection: {
    eyebrow: string;
    title: string;
    description: string;
    openProfile: string;
  };
  callout: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
  };
  footerContent: {
    tagline: string;
  };
  heroInsights: HeroInsight[];
  heroTrustPoints: string[];
  cityPortals: CityPortal[];
  categoryShortcuts: CategoryShortcut[];
  trustItems: string[];
  featuredBusinesses: FeaturedBusiness[];
  footerSections: FooterSection[];
  degraded: boolean;
};

const cityToneMap: Record<string, CityPortal["tone"]> = {
  "cagli-smoke": "emerald",
  cagli: "emerald",
  rimini: "violet",
  bologna: "amber",
  "demo-city": "rose",
};

const cityPortalOverrides: Record<
  string,
  Partial<Pick<CityPortal, "name" | "region" | "summary" | "activityLabel" | "badge">>
> = {
  "cagli-smoke": {
    name: "Cagli",
    region: "Marche",
    summary: "Ordina, prenota e trova servizi locali in pochi tocchi.",
  },
  cagli: {
    summary: "Ordina, prenota e trova servizi locali in pochi tocchi.",
  },
  rimini: {
    summary: "Scegli attivita, soggiorni e servizi con un percorso rapido e pulito.",
  },
  bologna: {
    summary: "Entra in una citta ricca di opzioni senza rumore o pagine dispersive.",
  },
};

const businessToneMap: Record<string, FeaturedBusiness["tone"]> = {
  "forno-locale-demo": "cafe",
  "bottega-del-corso": "cafe",
  "porto-pizza-club": "cafe",
  "studio-marea": "atelier",
  "harbor-stay": "service",
  "locanda-del-corso": "garden",
  "linea-blu-ncc": "service",
};

const businessMetrics: Record<
  string,
  {
    rating: string;
    reviews: string;
    distance: string;
    badge?: string;
  }
> = {
  "forno-locale-demo": { rating: "4.9", reviews: "128", distance: "0.4 km", badge: "In evidenza" },
  "bottega-del-corso": { rating: "4.8", reviews: "236", distance: "0.3 km", badge: "Live" },
  "studio-marea": { rating: "4.9", reviews: "126", distance: "0.6 km" },
  "locanda-del-corso": { rating: "4.7", reviews: "89", distance: "0.8 km" },
  "porto-pizza-club": { rating: "4.8", reviews: "312", distance: "1.2 km" },
  "harbor-stay": { rating: "4.7", reviews: "104", distance: "0.9 km" },
  "linea-blu-ncc": { rating: "4.8", reviews: "174", distance: "1.1 km" },
};

const categoryShortcuts: CategoryShortcut[] = [
  {
    title: "Food",
    description: "Ordini, take-away e tavoli locali.",
    href: "#showcase",
    icon: "order",
  },
  {
    title: "Stays",
    description: "Soggiorni, camere e accoglienza.",
    href: "#showcase",
    icon: "book",
  },
  {
    title: "Services",
    description: "Richieste, contatti e supporto utile.",
    href: "#showcase",
    icon: "manage",
  },
  {
    title: "Bookings",
    description: "Prenotazioni rapide e conferme chiare.",
    href: "#showcase",
    icon: "book",
  },
  {
    title: "Shops",
    description: "Scopri attivita e schede da attivare subito.",
    href: "#showcase",
    icon: "discover",
  },
];

const trustItems = ["Scopri", "Prenota", "Ordina", "Contatta", "Gestisci"];

const footerSections: FooterSection[] = [
  {
    title: "Esplora",
    links: [
      { label: "Citta attive", href: "#cities" },
      { label: "Categorie", href: "#categories" },
      { label: "Attivita live", href: "#showcase" },
    ],
  },
  {
    title: "CityCore",
    links: [
      { label: "Per le attivita", href: "#for-businesses" },
      { label: "Supporto", href: "mailto:hello@citycore.local" },
      { label: "Accedi", href: "/admin/login" },
    ],
  },
];

type BusinessMetrics = {
  rating: string;
  reviews: string;
  distance: string;
  badge?: string;
};

function buildCityBadge(index: number, businessCount: number) {
  if (index === 0) {
    return "Popolare";
  }

  if (businessCount >= 4) {
    return "In crescita";
  }

  return "Aperta";
}

function buildActivityLabel(businessCount: number) {
  return `${businessCount} attivita locali`;
}

function buildHeroInsights(data: HomepageSurfaceData): HeroInsight[] {
  return [
    {
      label: "Citta attive",
      value: String(data.featuredCities.length).padStart(2, "0"),
      detail: "Ingressi locali pronti da esplorare.",
    },
    {
      label: "Attivita live",
      value: String(data.showcaseBusinesses.length).padStart(2, "0"),
      detail: "Schede reali con contesto e prossime azioni.",
    },
    {
      label: "Accessi rapidi",
      value: "02",
      detail: "Per citta o per categoria, senza deviazioni inutili.",
    },
  ];
}

function supplementBySlug<T extends { slug: string }>(primary: T[], fallback: T[], target: number) {
  const taken = new Set(primary.map((entry) => entry.slug));
  const supplemented = [...primary];

  for (const entry of fallback) {
    if (supplemented.length >= target) {
      break;
    }

    if (taken.has(entry.slug)) {
      continue;
    }

    supplemented.push(entry);
    taken.add(entry.slug);
  }

  return supplemented;
}

export function buildHomepageViewModel(data: HomepageSurfaceData): HomepageViewModel {
  const fallbackCities = getFeaturedCities().map((city) => ({
    slug: city.slug,
    name: city.name,
    claim: city.claim,
    shortPitch: city.shortPitch,
    businessCount: city.businesses.length,
    href: `/${city.slug}`,
  }));
  const fallbackBusinesses = getHomepageShowcase().map((business) => ({
    slug: business.slug,
    name: business.name,
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

  const homepageCities = supplementBySlug(data.featuredCities, fallbackCities, 4);
  const homepageBusinesses = supplementBySlug(data.showcaseBusinesses, fallbackBusinesses, 2);

  const cityPortals = homepageCities.slice(0, 4).map((city, index) => {
    const profile = getCityProfile(city.slug);
    const portalOverride = cityPortalOverrides[city.slug];

    return {
      slug: city.slug,
      name: portalOverride?.name ?? city.name,
      region: portalOverride?.region ?? profile.region,
      summary: portalOverride?.summary ?? city.shortPitch,
      href: city.href,
      badge: portalOverride?.badge ?? buildCityBadge(index, city.businessCount),
      activityLabel: portalOverride?.activityLabel ?? buildActivityLabel(city.businessCount),
      tone: cityToneMap[city.slug] ?? (index % 2 === 0 ? "emerald" : "violet"),
    } satisfies CityPortal;
  });

  const featuredBusinesses = homepageBusinesses.slice(0, 2).map((business, index) => {
    const editorialMetrics =
      businessMetrics[business.slug] ??
      ({
        rating: "4.8",
        reviews: String(120 + index * 24),
        distance: `${(index + 4) / 10} km`,
      } satisfies BusinessMetrics);

    return {
      slug: business.slug,
      name: business.name,
      category: business.categoryLabel,
      cityName: business.cityName,
      summary: business.summary,
      href: business.href,
      rating: editorialMetrics.rating,
      reviews: editorialMetrics.reviews,
      distance: editorialMetrics.distance,
      badge: editorialMetrics.badge,
      tone: businessToneMap[business.slug] ?? "service",
    } satisfies FeaturedBusiness;
  });

  return {
    chooserLabel: "Scegli citta",
    degradedMessage:
      "Parte del catalogo pubblico usa ancora fallback editoriali, ma l'ingresso resta stabile mentre i dati live si riallineano.",
    hero: {
      eyebrow: "CityCore",
      titleLine: "Trova la tua citta.",
      accentLine: "Entra subito.",
      description: "Scegli una citta o parti da una categoria utile, senza passaggi inutili.",
      searchAria: "Scegli una citta",
      searchPlaceholder: "Scegli la tua citta",
      primaryCta: "Scegli la tua citta",
      secondaryCta: "Per le attivita",
      trustTitle: "Accesso chiaro, contesto reale.",
      trustDescription:
        "CityCore ordina citta, attivita e prossime azioni in un ingresso leggibile da mobile.",
    },
    entry: {
      eyebrow: "Inizia da qui",
      cityTitle: "Scegli la tua citta",
      cityDescription: "Entra subito nel contesto locale giusto.",
      cityCta: "Apri le citta attive",
      cityControlLabel: "Citta attive",
      categoryTitle: "Oppure esplora per categoria",
      categoryDescription: "Parti dal bisogno, non dalla struttura.",
      categoryCta: "Vai alle categorie",
      categoryPreview: categoryShortcuts.slice(0, 4).map((shortcut) => ({
        title: shortcut.title,
        href: shortcut.href,
      })),
    },
    citySection: {
      eyebrow: "Citta attive",
      title: "Ingresso locale, senza rumore.",
      description:
        "Quattro portali uguali, rapidi da scorrere e pronti a portarti verso attivita reali.",
      viewAll: "Vedi categorie",
      viewAllHref: "#categories",
    },
    categorySection: {
      eyebrow: "Categorie rapide",
      title: "Parti da quello che ti serve.",
      description: "Shortcut chiari per entrare subito da un bisogno reale.",
    },
    trustStrip: {
      eyebrow: "Azioni rapide",
      title: "Cinque azioni, un ingresso chiaro.",
      items: trustItems,
    },
    businessSection: {
      eyebrow: "Attivita live",
      title: "Due prove reali dentro CityCore.",
      description: "Basta poco per capire che l'ecosistema e gia vivo.",
      openProfile: "Apri scheda",
    },
    callout: {
      eyebrow: "Per le attivita locali",
      titleLine1: "Porta il tuo business",
      titleLine2: "dentro la citta.",
      description: "Visibilita locale e richieste piu chiare, senza strumenti pesanti da gestire.",
      primaryCta: "Inizia ora",
      secondaryCta: "Esplora le citta",
    },
    footerContent: {
      tagline: "Scegli una citta o una categoria e trova subito il prossimo passo.",
    },
    heroInsights: buildHeroInsights(data),
    heroTrustPoints: [
      "Citta e quartieri reali, non directory infinite.",
      "Attivita con contesto, segnali di fiducia e prossime azioni.",
      "Mobile-first per utenti e operatori locali.",
    ],
    cityPortals,
    categoryShortcuts,
    trustItems,
    featuredBusinesses,
    footerSections,
    degraded: data.degraded,
  };
}
