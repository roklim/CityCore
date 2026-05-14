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

export type Capability = {
  title: string;
  description: string;
  icon: "discover" | "book" | "order" | "contact" | "manage";
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
  citySection: {
    eyebrow: string;
    title: string;
    description: string;
    viewAll: string;
  };
  capabilitySection: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
  };
  businessSection: {
    eyebrow: string;
    title: string;
    viewAll: string;
    openProfile: string;
    exploreMore: string;
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
    newsletterTitle: string;
    newsletterDescription: string;
    newsletterPlaceholder: string;
    newsletterAria: string;
  };
  heroInsights: HeroInsight[];
  heroTrustPoints: string[];
  cityPortals: CityPortal[];
  capabilities: Capability[];
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
    summary: "Ordina, prenota e trova servizi utili attraverso un unico ingresso locale chiaro.",
  },
  cagli: {
    summary: "Ordina, prenota e trova servizi utili attraverso un unico ingresso locale chiaro.",
  },
  rimini: {
    summary:
      "Esplora servizi, soggiorni e attivita locali con un percorso rapido pensato per mobile.",
  },
  bologna: {
    summary: "Scegli tra piu opzioni senza rumore, con schede che restano facili da attivare.",
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
  "bottega-del-corso": { rating: "4.8", reviews: "236", distance: "0.3 km", badge: "In evidenza" },
  "studio-marea": { rating: "4.9", reviews: "126", distance: "0.6 km" },
  "locanda-del-corso": { rating: "4.7", reviews: "89", distance: "0.8 km" },
  "porto-pizza-club": { rating: "4.8", reviews: "312", distance: "1.2 km" },
  "harbor-stay": { rating: "4.7", reviews: "104", distance: "0.9 km" },
  "linea-blu-ncc": { rating: "4.8", reviews: "174", distance: "1.1 km" },
};

const capabilities: Capability[] = [
  {
    title: "Scopri",
    description: "Trova attivita affidabili e servizi utili senza perderti in directory infinite.",
    icon: "discover",
  },
  {
    title: "Prenota",
    description: "Prenota appuntamenti e disponibilita con percorsi brevi e leggibili.",
    icon: "book",
  },
  {
    title: "Ordina",
    description: "Ordina da attivita locali con menu chiari, tempi visibili e CTA forti.",
    icon: "order",
  },
  {
    title: "Contatta",
    description: "Chiama, scrivi o richiedi subito senza reimparare ogni singola pagina.",
    icon: "contact",
  },
  {
    title: "Gestisci",
    description: "Permetti agli operatori locali di lavorare bene da mobile o desktop.",
    icon: "manage",
  },
];

const footerSections: FooterSection[] = [
  {
    title: "Esplora",
    links: [
      { label: "Tutte le citta", href: "#cities" },
      { label: "Citta in evidenza", href: "#cities" },
      { label: "Vicino a me", href: "#cities" },
      { label: "Categorie", href: "#capabilities" },
    ],
  },
  {
    title: "Per le attivita",
    links: [
      { label: "Entra in CityCore", href: "#for-businesses" },
      { label: "Strumenti business", href: "/admin/login" },
      { label: "Pacchetti", href: "#for-businesses" },
      { label: "Risorse", href: "/admin/login" },
    ],
  },
  {
    title: "Azienda",
    links: [
      { label: "Chi siamo", href: "#showcase" },
      { label: "Lavora con noi", href: "#for-businesses" },
      { label: "Blog", href: "#showcase" },
      { label: "Contattaci", href: "mailto:hello@citycore.local" },
    ],
  },
  {
    title: "Supporto",
    links: [
      { label: "Centro assistenza", href: "/admin/login" },
      { label: "Sicurezza", href: "#showcase" },
      { label: "Privacy", href: "#for-businesses" },
      { label: "Termini di servizio", href: "#for-businesses" },
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
      detail: "Punti di ingresso reali, pronti da esplorare.",
    },
    {
      label: "Attivita live",
      value: String(data.showcaseBusinesses.length).padStart(2, "0"),
      detail: "Schede pubbliche con contesto, fiducia e azione.",
    },
    {
      label: "Azioni immediate",
      value: "05",
      detail: "Scopri, prenota, ordina, contatta e gestisci.",
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
  const homepageBusinesses = supplementBySlug(data.showcaseBusinesses, fallbackBusinesses, 5);

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

  const featuredBusinesses = homepageBusinesses.slice(0, 5).map((business, index) => {
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
    chooserLabel: "Scegli la tua citta",
    degradedMessage:
      "Parte del catalogo pubblico usa ancora fallback editoriali, ma l'esperienza resta coerente mentre i dati live si riallineano.",
    hero: {
      eyebrow: "La tua citta. Tutto connesso.",
      titleLine: "Trova cio che ti serve.",
      accentLine: "Sostieni cio che ami.",
      description:
        "CityCore e la piattaforma city-first per scoprire attivita locali affidabili, servizi utili e azioni chiare senza pagine rumorose o percorsi confusi.",
      searchAria: "Cerca una citta",
      searchPlaceholder: "Inserisci la tua citta",
      primaryCta: "Esplora la tua citta",
      secondaryCta: "Hai un'attivita locale?",
      trustTitle: "Pensato per le citta. Basato sulla fiducia.",
      trustDescription:
        "CityCore unisce attivita locali, segnali di fiducia e azioni utili in un ingresso ordinato e leggibile da mobile.",
    },
    citySection: {
      eyebrow: "Esplora le citta",
      title: "Scopri cosa succede davvero vicino a te.",
      description:
        "Ogni citta deve sembrare un vero portale locale: riconoscibile, leggibile e pronta a portarti dentro attivita e servizi reali.",
      viewAll: "Vedi tutte le citta",
    },
    capabilitySection: {
      eyebrow: "Cosa puoi fare",
      titleLine1: "Tutta la tua citta.",
      titleLine2: "In un solo posto.",
    },
    businessSection: {
      eyebrow: "Attivita locali in evidenza",
      title: "Scelte locali di cui fidarsi.",
      viewAll: "Vedi tutte le attivita",
      openProfile: "Apri scheda",
      exploreMore: "Esplora altre attivita",
    },
    callout: {
      eyebrow: "Per le attivita locali",
      titleLine1: "Entra in CityCore.",
      titleLine2: "Cresci con la tua citta.",
      description:
        "Gestisci la tua presenza locale, collega domanda e azione e lavora con ordini, richieste e insight piu chiari da mobile o desktop.",
      primaryCta: "Inizia ora",
      secondaryCta: "Guarda come funziona",
    },
    footerContent: {
      tagline: "La tua citta. Connessa. Piu forte insieme.",
      newsletterTitle: "Resta nel giro",
      newsletterDescription:
        "Ricevi nuove citta, aggiornamenti prodotto e storie locali direttamente nella tua inbox.",
      newsletterPlaceholder: "Inserisci la tua email",
      newsletterAria: "La tua email",
    },
    heroInsights: buildHeroInsights(data),
    heroTrustPoints: [
      "Costruito per citta e quartieri reali, non per directory generiche infinite.",
      "Attivita locali presentate con contesto, segnali di fiducia e prossime azioni chiare.",
      "Mobile-first per utenti finali e operatori business.",
    ],
    cityPortals,
    capabilities,
    featuredBusinesses,
    footerSections,
    degraded: data.degraded,
  };
}
