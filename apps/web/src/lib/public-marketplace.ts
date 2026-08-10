import {
  BUSINESS_TEMPLATE_DEFINITIONS,
  MODULE_DEFINITIONS,
  getTemplateDefinition,
} from "@platform/templates";
import { slugify } from "@platform/shared";

type ModuleCode = (typeof MODULE_DEFINITIONS)[number]["code"];
type TemplateCode = (typeof BUSINESS_TEMPLATE_DEFINITIONS)[number]["code"];

export type PublicBusinessProfile = {
  name: string;
  slug: string;
  citySlug: string;
  templateCode: TemplateCode;
  moduleCode: ModuleCode;
  categoryLabel: string;
  summary: string;
  area: string;
  eta: string;
  vibe: string;
  trustLine: string;
  priceHint: string;
  contactPhone: string;
  addressLine: string;
  openNowLabel: string;
  heroTitle: string;
  heroDescription: string;
  ctaPrimary: string;
  ctaSecondary: string;
  highlights: string[];
  serviceMoments: string[];
  faq: Array<{ question: string; answer: string }>;
};

export type PublicCityProfile = {
  name: string;
  slug: string;
  region: string;
  claim: string;
  shortPitch: string;
  neighborhoods: string[];
  quickFilters: ModuleCode[];
  featuredModules: ModuleCode[];
  businesses: PublicBusinessProfile[];
};

const cityProfiles: Record<string, Omit<PublicCityProfile, "slug">> = {
  cagli: {
    name: "Cagli",
    region: "Marche",
    claim: "Città compatta, identità chiara, attività leggibili.",
    shortPitch:
      "Scopri attività, strutture, servizi e pagine locali senza passare da directory fredde o percorsi confusi.",
    neighborhoods: ["Centro storico", "Porta Massara", "San Geronzio", "Ponte Murato"],
    quickFilters: ["catalog", "booking", "directory", "events"],
    featuredModules: ["catalog", "booking", "directory"],
    businesses: [],
  },
  rimini: {
    name: "Rimini",
    region: "Emilia-Romagna",
    claim: "Territorio vivo, pagine chiare, percorsi brevi.",
    shortPitch:
      "Perfetta per ospitalità, servizi e vetrine locali: l'utente entra, capisce e sceglie senza attrito.",
    neighborhoods: ["Marina Centro", "Borgo San Giuliano", "Miramare", "Bellariva"],
    quickFilters: ["hospitality", "booking", "listings", "events"],
    featuredModules: ["hospitality", "booking", "events"],
    businesses: [],
  },
  bologna: {
    name: "Bologna",
    region: "Emilia-Romagna",
    claim: "Offerta ricca, filtri chiari, identità forti.",
    shortPitch:
      "La pagina della città deve aiutare a scegliere tra molte opzioni senza sembrare una bacheca sovraccarica.",
    neighborhoods: ["Centro", "Bolognina", "Saragozza", "Murri"],
    quickFilters: ["catalog", "booking", "listings", "directory"],
    featuredModules: ["catalog", "booking", "listings"],
    businesses: [],
  },
};

function titleFromSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function getModuleLabel(code: ModuleCode) {
  return MODULE_DEFINITIONS.find((item) => item.code === code)?.label ?? code;
}

function createBusinessProfile(
  citySlug: string,
  input: {
    name: string;
    templateCode: TemplateCode;
    moduleCode?: ModuleCode;
    summary: string;
    area: string;
    eta: string;
    vibe: string;
    trustLine: string;
    priceHint: string;
    contactPhone: string;
    addressLine: string;
    openNowLabel: string;
    heroTitle: string;
    heroDescription: string;
    highlights: string[];
    serviceMoments: string[];
    faq: Array<{ question: string; answer: string }>;
  },
): PublicBusinessProfile {
  const template = getTemplateDefinition(input.templateCode);
  const moduleCode = input.moduleCode ?? template.primaryModule;

  return {
    name: input.name,
    slug: slugify(input.name),
    citySlug,
    templateCode: template.code,
    moduleCode,
    categoryLabel: template.label,
    summary: input.summary,
    area: input.area,
    eta: input.eta,
    vibe: input.vibe,
    trustLine: input.trustLine,
    priceHint: input.priceHint,
    contactPhone: input.contactPhone,
    addressLine: input.addressLine,
    openNowLabel: input.openNowLabel,
    heroTitle: input.heroTitle,
    heroDescription: input.heroDescription,
    ctaPrimary: template.defaultCtaLabel,
    ctaSecondary: "Chiama ora",
    highlights: input.highlights,
    serviceMoments: input.serviceMoments,
    faq: input.faq,
  };
}

const seededBusinesses = {
  cagli: [
    createBusinessProfile("cagli", {
      name: "Bottega Civica",
      templateCode: "local_business",
      summary:
        "Vetrina locale con catalogo essenziale, contenuti puliti e informazioni pratiche sempre in primo piano.",
      area: "Centro storico",
      eta: "Percorso diretto",
      vibe: "Commercio locale curato",
      trustLine: "Catalogo leggibile, contatti chiari e tono sobrio.",
      priceHint: "Catalog",
      contactPhone: "+39 0721 900120",
      addressLine: "Via Flaminia 18, Cagli",
      openNowLabel: "Scheda aggiornata",
      heroTitle: "Un business locale deve spiegarsi in pochi secondi.",
      heroDescription:
        "Contenuti chiari, CTA pulita e struttura pronta a crescere senza perdere leggibilità.",
      highlights: ["Catalogo base", "Galleria curata", "Contatto rapido"],
      serviceMoments: ["Scoperta", "Confronto", "Contatto"],
      faq: [
        {
          question: "La pagina può evolvere senza essere rifatta?",
          answer: "Sì, la struttura è già pensata per moduli e sezioni riordinabili.",
        },
        {
          question: "Il catalogo è solo visivo?",
          answer:
            "Per ora è una struttura coerente con il core della piattaforma e con la pagina pubblica.",
        },
      ],
    }),
    createBusinessProfile("cagli", {
      name: "Studio Aurora",
      templateCode: "studio_service",
      summary:
        "Studio professionale con servizi leggibili, disponibilità guidata e CTA costruita per arrivare presto al contatto giusto.",
      area: "Porta Massara",
      eta: "Disponibilità guidata",
      vibe: "Servizio essenziale",
      trustLine: "Servizi, tono e informazioni pratiche raccontati senza rumore visivo.",
      priceHint: "Booking",
      contactPhone: "+39 0721 900121",
      addressLine: "Via del Teatro 7, Cagli",
      openNowLabel: "Richieste aperte",
      heroTitle:
        "Prenotare o chiedere informazioni deve essere semplice come scegliere il servizio.",
      heroDescription:
        "Servizi chiari, prossimi passi leggibili e una CTA che porta subito alla disponibilità.",
      highlights: ["Servizi chiari", "Agenda futura", "Contatto diretto"],
      serviceMoments: ["Prima visita", "Richiesta rapida", "Routine periodica"],
      faq: [
        {
          question: "Serve un account per contattare lo studio?",
          answer: "No, il percorso pubblico deve restare immediato e leggero.",
        },
        {
          question: "Le disponibilità sono già definitive?",
          answer: "Sono una base modulare pronta a crescere senza riscrivere la pagina.",
        },
      ],
    }),
    createBusinessProfile("cagli", {
      name: "Agenda Cagli",
      templateCode: "events_listings",
      summary:
        "Raccolta editoriale per eventi, annunci e vetrine locali con schede ordinate e contesto chiaro.",
      area: "San Geronzio",
      eta: "Aggiornamento continuo",
      vibe: "Editoriale locale",
      trustLine: "Scoperta locale, priorità chiare e filtri leggeri.",
      priceHint: "Listings",
      contactPhone: "+39 0721 900122",
      addressLine: "Corso XX Settembre 4, Cagli",
      openNowLabel: "Pubblicazioni attive",
      heroTitle: "Una città vive meglio quando eventi e vetrine hanno una forma leggibile.",
      heroDescription:
        "Questa pagina mostra come raccolte editoriali e business possano convivere nello stesso ecosistema.",
      highlights: ["Eventi locali", "Vetrine curate", "Contesto cittadino"],
      serviceMoments: ["Weekend", "Scoperta locale", "Segnalazioni"],
      faq: [
        {
          question: "Gli annunci sono separati dai business?",
          answer: "Sì, ma restano dentro la stessa grammatica di piattaforma.",
        },
        {
          question: "La città può promuovere contenuti in evidenza?",
          answer:
            "Sì, la superficie city-first prevede contenuti e collezioni editoriali in evidenza.",
        },
      ],
    }),
  ],
  rimini: [
    createBusinessProfile("rimini", {
      name: "Harbor Stay",
      templateCode: "hospitality",
      summary:
        "Piccola struttura ricettiva con pagina essenziale, richiesta soggiorno rapida e info pratiche senza sovraccarico.",
      area: "Borgo San Giuliano",
      eta: "Richiesta in giornata",
      vibe: "Stay light",
      trustLine: "Camere, policy e contatto: tutto davanti all'utente in pochi scroll.",
      priceHint: "Hospitality",
      contactPhone: "+39 0541 400121",
      addressLine: "Via dei Molini 11, Rimini",
      openNowLabel: "Richieste aperte",
      heroTitle: "Una pagina soggiorno leggera ma affidabile, pensata per convertire.",
      heroDescription:
        "Niente booking engine enorme: solo cio che serve per capire struttura, posizione e prossimi passi.",
      highlights: ["Check-in flessibile", "Mappa immediata", "Camere chiare"],
      serviceMoments: ["Weekend mare", "Lavoro in città", "Pernottamento breve"],
      faq: [
        {
          question: "La richiesta e immediata?",
          answer: "Qui il focus e sulla richiesta ben guidata, non su un motore OTA complesso.",
        },
        {
          question: "Vedo le policy prima di inviare?",
          answer: "Sì, le regole base stanno nella sezione pratica sopra le FAQ.",
        },
      ],
    }),
    createBusinessProfile("rimini", {
      name: "Studio Onde",
      templateCode: "studio_service",
      summary:
        "Studio di servizi locali con agenda futura, percorso di richiesta chiaro e gerarchia progettata per il mobile.",
      area: "Marina Centro",
      eta: "Risposta rapida",
      vibe: "Servizi urbani",
      trustLine: "Pagina compatta, tono professionale e percorso breve verso il contatto.",
      priceHint: "Booking",
      contactPhone: "+39 0541 400122",
      addressLine: "Viale Vespucci 42, Rimini",
      openNowLabel: "Contatto disponibile",
      heroTitle: "Un servizio locale deve orientare prima di convincere.",
      heroDescription:
        "La pagina dichiara subito cosa offre, per chi e come iniziare senza passaggi inutili.",
      highlights: ["Servizi chiari", "Contatto veloce", "CTA guidata"],
      serviceMoments: ["Prima visita", "Informazioni", "Appuntamento"],
      faq: [
        {
          question: "Posso capire subito il servizio principale?",
          answer: "Sì, la pagina mette il modulo principale sopra i dettagli secondari.",
        },
        {
          question: "La superficie è già pronta per crescere?",
          answer: "Sì, contenuti e moduli possono espandersi senza cambiare la gerarchia.",
        },
      ],
    }),
    createBusinessProfile("rimini", {
      name: "Rimini Highlights",
      templateCode: "events_listings",
      summary:
        "Hub editoriale per eventi, luoghi e novità locali con collezioni curate e segnali utili per chi arriva in città.",
      area: "Miramare",
      eta: "Aggiornato oggi",
      vibe: "Agenda cittadina",
      trustLine: "Collezioni tematiche, featured locali e tono editoriale coerente.",
      priceHint: "Events",
      contactPhone: "+39 0541 400123",
      addressLine: "Viale Regina Margherita 88, Rimini",
      openNowLabel: "Aggiornamento attivo",
      heroTitle: "Gli eventi locali funzionano meglio quando la città li racconta con chiarezza.",
      heroDescription:
        "Featured, collezioni e annunci entrano in un'unica esperienza invece di disperdersi in pagine isolate.",
      highlights: ["Agenda locale", "Segnalazioni", "Collezioni curate"],
      serviceMoments: ["Weekend", "Scoperta", "Attivazioni"],
      faq: [
        {
          question: "Questa pagina è un marketplace?",
          answer: "No, è un livello editoriale cittadino sopra attività e moduli.",
        },
        {
          question: "Può convivere con attività e strutture?",
          answer: "Sì, è proprio uno dei punti forti del modello city-first.",
        },
      ],
    }),
  ],
};

for (const [citySlug, businesses] of Object.entries(seededBusinesses)) {
  if (cityProfiles[citySlug]) {
    cityProfiles[citySlug].businesses = businesses;
  }
}

export function getCityProfile(citySlug: string): PublicCityProfile {
  const base = cityProfiles[citySlug];

  if (base) {
    return {
      ...base,
      slug: citySlug,
    };
  }

  return {
    slug: citySlug,
    name: titleFromSlug(citySlug),
    region: "Italia",
    claim: "Una città pensata per farti scegliere in fretta e bene.",
    shortPitch:
      "Anche senza dati completi, la struttura resta orientata alla scoperta locale e alla scelta rapida da telefono.",
    neighborhoods: ["Centro", "Stazione", "Mercato", "Quartiere nord"],
    quickFilters: ["catalog", "booking", "directory"],
    featuredModules: ["catalog", "booking"],
    businesses: [
      createBusinessProfile(citySlug, {
        name: `${titleFromSlug(citySlug)} Hub`,
        templateCode: "local_business",
        summary:
          "Un esempio di attività locale con pagina leggibile, CTA forte e struttura pronta per contenuti, catalogo e contatti.",
        area: "Centro",
        eta: "Risposta rapida",
        vibe: "Attività locale",
        trustLine: "Informazioni pratiche subito visibili e percorso rapido verso l'azione.",
        priceHint: "Catalog",
        contactPhone: "+39 000 000000",
        addressLine: `Via Centrale 1, ${titleFromSlug(citySlug)}`,
        openNowLabel: "Disponibile oggi",
        heroTitle: "Un business pubblico deve spiegarsi in pochi secondi.",
        heroDescription:
          "Questa struttura mostra come la piattaforma può presentare un'attività in modo chiaro, ordinato e utile.",
        highlights: ["CTA chiara", "Hero leggibile", "Blocchi mobile-first"],
        serviceMoments: ["Scelta rapida", "Telefono", "Percorso diretto"],
        faq: [
          {
            question: "Perché questa pagina è facile da consultare?",
            answer: "Perché usa il linguaggio dell'utente e mette in evidenza le azioni utili.",
          },
          {
            question: "È già collegata a un modulo specialistico completo?",
            answer:
              "Non ancora, ma la struttura è pronta per accoglierlo senza cambiare il linguaggio della pagina.",
          },
        ],
      }),
    ],
  };
}

export function getBusinessProfile(citySlug: string, businessSlug: string) {
  const city = getCityProfile(citySlug);
  const found = city.businesses.find((business) => business.slug === businessSlug);

  if (found) {
    return found;
  }

  const guessTemplate =
    BUSINESS_TEMPLATE_DEFINITIONS.find((template) =>
      businessSlug.includes(template.code.replaceAll("_", "-")),
    )?.code ?? "local_business";

  return createBusinessProfile(citySlug, {
    name: titleFromSlug(businessSlug),
    templateCode: guessTemplate,
    summary:
      "Pagina pubblica essenziale per presentare informazioni, contatti e servizi dell'attività.",
    area: "Centro",
    eta: "Risposta rapida",
    vibe: "Attività locale",
    trustLine: "Identità chiara, azione principale e informazioni pratiche senza rumore.",
    priceHint: "Profile",
    contactPhone: "+39 000 000000",
    addressLine: `Via Principale 12, ${city.name}`,
    openNowLabel: "Contatto disponibile oggi",
    heroTitle: `${titleFromSlug(businessSlug)} presenta informazioni e contatti in modo chiaro.`,
    heroDescription:
      "Questa pagina mostra la forma finale desiderata: chiara, ordinata, orientata all'azione e leggibile soprattutto da telefono.",
    highlights: ["Hero forte", "CTA above the fold", "Trust blocks ordinati"],
    serviceMoments: ["Scoperta", "Contatto", "Conversione"],
    faq: [
      {
        question: "La pagina è pronta anche se i dati pubblici sono pochi?",
        answer:
          "Sì, la struttura è progettata per valorizzare anche un insieme essenziale di informazioni.",
      },
      {
        question: "Che tipo di modulo può ospitare?",
        answer: `Qualsiasi modulo principale della piattaforma, in questo caso ${getModuleLabel(
          getTemplateDefinition(guessTemplate).primaryModule,
        )}.`,
      },
    ],
  });
}

export function getFallbackCityProfile(citySlug: string) {
  return cityProfiles[citySlug] ? getCityProfile(citySlug) : null;
}

export function getFallbackBusinessProfile(citySlug: string, businessSlug: string) {
  const city = getFallbackCityProfile(citySlug);
  return city?.businesses.find((business) => business.slug === businessSlug) ?? null;
}

export function getFeaturedCities() {
  return ["cagli", "rimini", "bologna"].map((slug) => getCityProfile(slug));
}
