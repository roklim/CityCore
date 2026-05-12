import {
  BUSINESS_TEMPLATE_DEFINITIONS,
  MODULE_DEFINITIONS,
  getTemplateDefinition,
} from "@platform/templates";
import { buildBusinessPath, buildCityPath, slugify } from "@platform/shared";

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
    claim: "Piccola citta, scelta rapida, attivita che rispondono davvero.",
    shortPitch:
      "Scopri dove ordinare, prenotare o trovare servizi utili senza passare da directory fredde o vetrine confuse.",
    neighborhoods: ["Centro storico", "Porta Massara", "San Geronzio", "Ponte Murato"],
    quickFilters: ["ordering", "appointments", "directory", "mobility_request"],
    featuredModules: ["ordering", "appointments", "directory"],
    businesses: [],
  },
  rimini: {
    name: "Rimini",
    region: "Emilia-Romagna",
    claim: "Tra mare, quartieri e flussi veloci: scegli in pochi tap.",
    shortPitch:
      "Perfetta per attivita locali, servizi e ospitalita leggera: l'utente entra, capisce e compie l'azione giusta senza attrito.",
    neighborhoods: ["Marina Centro", "Borgo San Giuliano", "Miramare", "Bellariva"],
    quickFilters: ["ordering", "appointments", "stays", "mobility_request"],
    featuredModules: ["ordering", "stays", "appointments"],
    businesses: [],
  },
  bologna: {
    name: "Bologna",
    region: "Emilia-Romagna",
    claim: "Offerta ricca, filtri chiari, attivita che si distinguono per utilita reale.",
    shortPitch:
      "La pagina citta deve aiutare a scegliere tra molte opzioni senza sembrare una bacheca sovraccarica.",
    neighborhoods: ["Centro", "Bolognina", "Saragozza", "Murri"],
    quickFilters: ["ordering", "appointments", "stays", "directory"],
    featuredModules: ["ordering", "appointments", "directory"],
    businesses: [],
  },
  "demo-city": {
    name: "Demo City",
    region: "Sandbox",
    claim: "Ambiente demo, ma con struttura da prodotto vero.",
    shortPitch:
      "Usa questa citta per verificare il linguaggio della V2 pubblica senza ricadere nella vecchia estetica da prototipo.",
    neighborhoods: ["North Block", "Old Town", "Riverside", "Station Quarter"],
    quickFilters: ["ordering", "appointments", "directory", "events"],
    featuredModules: ["ordering", "appointments", "directory"],
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
      name: "Bottega del Corso",
      templateCode: "pizzeria",
      summary:
        "Pizze, fritti e menu serali con una pagina pensata per far scegliere in fretta e ordinare senza ambiguita.",
      area: "Centro storico",
      eta: "20-30 min",
      vibe: "Comfort food locale",
      trustLine: "Consegna chiara, menu leggibile, fascia serale ben visibile.",
      priceHint: "€€",
      contactPhone: "+39 0721 900120",
      addressLine: "Via Flaminia 18, Cagli",
      openNowLabel: "Apre alle 18:30",
      heroTitle: "La pizzeria di riferimento per una serata semplice da organizzare.",
      heroDescription:
        "Menu diretto, combinazioni facili da capire e tempi stimati che aiutano a decidere subito, anche da telefono.",
      highlights: ["Impasto 48h", "Menu bambini", "Takeaway veloce"],
      serviceMoments: ["Cena rapida", "Asporto serale", "Gruppi piccoli"],
      faq: [
        {
          question: "Come si ordina?",
          answer:
            "Dal CTA principale, con percorso corto e informazioni essenziali prima del checkout.",
        },
        {
          question: "La consegna e disponibile ovunque?",
          answer: "La pagina evidenzia subito la zona servita e l'eventuale ritiro in sede.",
        },
      ],
    }),
    createBusinessProfile("cagli", {
      name: "Studio Marea",
      templateCode: "beauty",
      summary:
        "Trattamenti beauty con agenda leggibile, slot chiari e pagina costruita per trasformare la visita in prenotazione.",
      area: "Porta Massara",
      eta: "Slot da 45 min",
      vibe: "Beauty essenziale",
      trustLine: "Servizi, durata e disponibilita raccontati senza rumore visivo.",
      priceHint: "€€",
      contactPhone: "+39 0721 900121",
      addressLine: "Via del Teatro 7, Cagli",
      openNowLabel: "Slot disponibili domani",
      heroTitle: "Prenotare un trattamento deve essere semplice come sceglierlo.",
      heroDescription:
        "Servizi chiari, tempi di esecuzione leggibili e una CTA che porta subito allo slot giusto.",
      highlights: ["Trattamenti viso", "Pacchetti rapidi", "Reminder smart"],
      serviceMoments: ["Pausa pranzo", "Dopo lavoro", "Routine mensile"],
      faq: [
        {
          question: "Posso scegliere il trattamento senza chiamare?",
          answer:
            "Sì, la pagina rende i servizi confrontabili e porta direttamente alla prenotazione.",
        },
        {
          question: "Ci sono slot serali?",
          answer: "Gli orari disponibili vengono evidenziati nella parte alta della pagina.",
        },
      ],
    }),
    createBusinessProfile("cagli", {
      name: "Locanda del Corso",
      templateCode: "service",
      moduleCode: "directory",
      summary:
        "Ospitalita leggera e cucina locale, pensata per chi vuole capire al volo se il posto fa al caso suo.",
      area: "San Geronzio",
      eta: "Risposta entro 15 min",
      vibe: "Accoglienza locale",
      trustLine: "Contatti immediati, informazioni pratiche e tono caldo ma ordinato.",
      priceHint: "€€",
      contactPhone: "+39 0721 900122",
      addressLine: "Corso XX Settembre 4, Cagli",
      openNowLabel: "Risponde oggi",
      heroTitle: "Una vetrina chiara per farsi scegliere senza disperdere attenzione.",
      heroDescription:
        "Poche informazioni ma decisive: cosa offre, dove si trova, come contattarla e perche conviene farlo adesso.",
      highlights: ["Camere essenziali", "Colazione locale", "Check-in guidato"],
      serviceMoments: ["Weekend breve", "Fermata di passaggio", "Soggiorni tranquilli"],
      faq: [
        {
          question: "È una prenotazione immediata?",
          answer:
            "No, qui il focus e sulla richiesta rapida e sul contatto diretto ben strutturato.",
        },
        {
          question: "La struttura e centrale?",
          answer: "La posizione e presentata subito, insieme ai servizi utili per orientarsi.",
        },
      ],
    }),
  ],
  rimini: [
    createBusinessProfile("rimini", {
      name: "Porto Pizza Club",
      templateCode: "restaurant",
      summary:
        "Pizza, tavoli e servizio rapido con taglio visivo piu urbano e CTA pensata per ordini e menu serali.",
      area: "Marina Centro",
      eta: "25 min",
      vibe: "Food vista mare",
      trustLine: "Menu visibile subito, prezzo orientativo e disponibilita facile da leggere.",
      priceHint: "€€",
      contactPhone: "+39 0541 400120",
      addressLine: "Viale Vespucci 42, Rimini",
      openNowLabel: "Aperto fino alle 23:30",
      heroTitle: "Mangiare vicino al mare senza perdere tempo tra pagine dispersive.",
      heroDescription:
        "Qui la scelta si fa in pochi gesti: piatti in evidenza, CTA primaria forte e informazioni pratiche dove servono.",
      highlights: ["Menu serale", "Takeaway", "Prenota tavolo"],
      serviceMoments: ["Cena sul mare", "Gruppi amici", "Asporto veloce"],
      faq: [
        {
          question: "Posso consultare il menu da telefono senza zoom?",
          answer:
            "Sì, la pagina è strutturata per far leggere piatti e CTA in una sola colonna mobile.",
        },
        {
          question: "C'è anche ritiro?",
          answer: "Sì, i percorsi ritiro e consumazione vengono separati chiaramente.",
        },
      ],
    }),
    createBusinessProfile("rimini", {
      name: "Harbor Stay",
      templateCode: "bnb",
      summary:
        "Piccola struttura ricettiva con pagina essenziale, richiesta soggiorno rapida e info pratiche senza sovraccarico.",
      area: "Borgo San Giuliano",
      eta: "Conferma in giornata",
      vibe: "Stay light",
      trustLine: "Camere, policy e contatto: tutto davanti all'utente in pochi scroll.",
      priceHint: "€€€",
      contactPhone: "+39 0541 400121",
      addressLine: "Via dei Molini 11, Rimini",
      openNowLabel: "Richieste aperte",
      heroTitle: "Una pagina soggiorno leggera ma affidabile, pensata per convertire.",
      heroDescription:
        "Niente hotel-booking enorme: solo cio che serve per capire disponibilita, posizione e prossimi passi.",
      highlights: ["Check-in flessibile", "Mappa immediata", "Camere smart"],
      serviceMoments: ["Weekend mare", "Lavoro in citta", "Pernottamento breve"],
      faq: [
        {
          question: "La prenotazione è immediata?",
          answer: "Qui il focus è sulla richiesta ben guidata, non su un motore OTA complesso.",
        },
        {
          question: "Vedo le policy prima di inviare?",
          answer: "Sì, le regole base sono nella sezione pratica sopra le FAQ.",
        },
      ],
    }),
    createBusinessProfile("rimini", {
      name: "Linea Blu NCC",
      templateCode: "taxi_ncc",
      summary:
        "Richieste trasporto locali con modulo centrale, aree servite e promessa chiara sul tempo di risposta.",
      area: "Miramare",
      eta: "Risposta entro 10 min",
      vibe: "Mobilita locale",
      trustLine: "Zone coperte, fascia oraria e richiesta chiara senza effetti speciali inutili.",
      priceHint: "Su richiesta",
      contactPhone: "+39 0541 400122",
      addressLine: "Viale Regina Margherita 88, Rimini",
      openNowLabel: "Disponibile fino a notte",
      heroTitle: "Richiedi un trasporto locale senza dover capire una piattaforma complicata.",
      heroDescription:
        "La CTA primaria porta subito alla richiesta, mentre la pagina chiarisce area servita, orari e tempi di conferma.",
      highlights: ["Transfer stazione", "Corsa aeroporto", "Servizio locale"],
      serviceMoments: ["Arrivi serali", "Trasferte veloci", "Spostamenti turistici"],
      faq: [
        {
          question: "Devo creare un account?",
          answer: "No, il primo obiettivo è inviare la richiesta in modo semplice e comprensibile.",
        },
        {
          question: "Le aree servite sono chiare?",
          answer: "Sì, vengono evidenziate sopra il modulo per evitare richieste fuori perimetro.",
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
    claim: "Una citta pensata per farti scegliere in fretta e bene.",
    shortPitch:
      "Anche senza dati completi, la struttura resta orientata alla scoperta locale e alla scelta rapida da telefono.",
    neighborhoods: ["Centro", "Stazione", "Mercato", "Quartiere nord"],
    quickFilters: ["ordering", "appointments", "directory"],
    featuredModules: ["ordering", "appointments"],
    businesses: [
      createBusinessProfile(citySlug, {
        name: `${titleFromSlug(citySlug)} Hub`,
        templateCode: "service",
        summary:
          "Un esempio di attivita locale con pagina leggibile, CTA forte e struttura pronta per richieste, contenuti e azioni semplici.",
        area: "Centro",
        eta: "Risposta rapida",
        vibe: "Attivita locale",
        trustLine: "Informazioni pratiche subito visibili e percorso rapido verso l'azione.",
        priceHint: "Da definire",
        contactPhone: "+39 000 000000",
        addressLine: `Via Centrale 1, ${titleFromSlug(citySlug)}`,
        openNowLabel: "Disponibile oggi",
        heroTitle: "Un business pubblico deve spiegarsi in pochi secondi.",
        heroDescription:
          "Questa struttura mostra come la V2 puo presentare un'attivita in modo chiaro, ordinato e utile.",
        highlights: ["CTA chiara", "Hero leggibile", "Blocchi mobili-first"],
        serviceMoments: ["Scelta rapida", "Telefono", "Percorso diretto"],
        faq: [
          {
            question: "Perché questa pagina è diversa dal cantiere precedente?",
            answer: "Perché parla il linguaggio dell'utente, non quello della roadmap tecnica.",
          },
          {
            question: "È già collegata a un flusso transazionale completo?",
            answer:
              "Non ancora, ma la struttura è pronta per innestarlo senza cambiare il linguaggio della pagina.",
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
    )?.code ?? "service";

  return createBusinessProfile(citySlug, {
    name: titleFromSlug(businessSlug),
    templateCode: guessTemplate,
    summary:
      "Pagina pubblica fallback costruita per restare credibile anche quando non esiste ancora un record completo nel data layer pubblico.",
    area: "Centro",
    eta: "Risposta rapida",
    vibe: "Attivita locale",
    trustLine: "Identity chiara, CTA centrale e informazioni pratiche senza rumore.",
    priceHint: "Da definire",
    contactPhone: "+39 000 000000",
    addressLine: `Via Principale 12, ${city.name}`,
    openNowLabel: "Contatto disponibile oggi",
    heroTitle: `${titleFromSlug(businessSlug)} deve convincere senza sembrare un prototipo.`,
    heroDescription:
      "Questa pagina mostra la forma finale desiderata: chiara, ordinata, orientata all'azione e leggibile soprattutto da telefono.",
    highlights: ["Hero forte", "CTA above the fold", "Trust blocks ordinati"],
    serviceMoments: ["Scoperta", "Contatto", "Conversione"],
    faq: [
      {
        question: "La pagina è pronta anche se i dati pubblici sono pochi?",
        answer:
          "Sì, la struttura è progettata per reggere anche prima del collegamento completo ai dati pubblici V2.",
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

export function getFeaturedCities() {
  return ["cagli", "rimini", "bologna"].map((slug) => getCityProfile(slug));
}

export function getHomepageShowcase() {
  return getFeaturedCities().flatMap((city) =>
    city.businesses.slice(0, 2).map((business) => ({
      ...business,
      cityName: city.name,
      cityClaim: city.claim,
      href: buildBusinessPath({
        citySlug: city.slug,
        businessSlug: business.slug,
      }),
      cityHref: buildCityPath(city.slug),
    })),
  );
}
