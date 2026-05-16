import {
  MODULE_CODES,
  TEMPLATE_CODES,
  type ModuleCode,
  type TemplateCategory,
  type TemplateCode,
  createLookup,
} from "@platform/domain";

export type PublicSectionType =
  | "hero"
  | "highlights"
  | "faq"
  | "menu_preview"
  | "services"
  | "rooms"
  | "transport"
  | "gallery"
  | "contact";

export type ModuleDefinition = {
  code: ModuleCode;
  label: string;
  summary: string;
  operationalFocus: string;
};

export const MODULE_DEFINITIONS = [
  {
    code: "ordering",
    label: "Ordering",
    summary: "Menu, carrello, ordini e disponibilita per food e retail leggero.",
    operationalFocus: "Menu, ordini e operativita banco.",
  },
  {
    code: "appointments",
    label: "Appointments",
    summary: "Servizi, slot, disponibilita e prenotazioni per barber e beauty.",
    operationalFocus: "Calendario, servizi e staff.",
  },
  {
    code: "stays",
    label: "Stays",
    summary: "Camere, disponibilita e richieste soggiorno per strutture light.",
    operationalFocus: "Camere, richieste e calendario soggiorni.",
  },
  {
    code: "mobility_request",
    label: "Mobility Request",
    summary: "Richieste trasporto locali con gestione manuale o semi-manuale.",
    operationalFocus: "Richieste corsa e area servita.",
  },
  {
    code: "rentals",
    label: "Rentals",
    summary: "Noleggi locali per bici, attrezzatura e item prenotabili.",
    operationalFocus: "Stock, durata e restituzioni.",
  },
  {
    code: "directory",
    label: "Directory",
    summary: "Visibilita e discovery locale senza flusso transazionale pesante.",
    operationalFocus: "Contenuti pubblici e ranking.",
  },
  {
    code: "events",
    label: "Events",
    summary: "Programmazione eventi e attivazioni territoriali future.",
    operationalFocus: "Calendario e promozione eventi.",
  },
] as const satisfies readonly ModuleDefinition[];

export const MODULE_DEFINITION_MAP = createLookup(MODULE_DEFINITIONS);

export type BusinessTemplateDefinition = {
  code: TemplateCode;
  label: string;
  category: TemplateCategory;
  primaryModule: ModuleCode;
  defaultCtaLabel: string;
  summary: string;
  onboardingFields: readonly string[];
  sectionTypes: readonly PublicSectionType[];
};

export const BUSINESS_TEMPLATE_DEFINITIONS = [
  {
    code: "pizzeria",
    label: "Pizzeria",
    category: "food",
    primaryModule: "ordering",
    defaultCtaLabel: "Ordina ora",
    summary: "Locale food con menu, disponibilita rapida e carrello.",
    onboardingFields: ["name", "city", "hours", "menu", "contacts"],
    sectionTypes: ["hero", "menu_preview", "faq", "gallery", "contact"],
  },
  {
    code: "restaurant",
    label: "Restaurant",
    category: "food",
    primaryModule: "ordering",
    defaultCtaLabel: "Scopri il menu",
    summary: "Ristorante con discovery menu, tavolozza visuale e ordering leggero.",
    onboardingFields: ["name", "city", "hours", "menu", "story"],
    sectionTypes: ["hero", "highlights", "menu_preview", "gallery", "contact"],
  },
  {
    code: "sushi",
    label: "Sushi",
    category: "food",
    primaryModule: "ordering",
    defaultCtaLabel: "Ordina sushi",
    summary: "Verticale food veloce con menu, combo e disponibilita in tempo reale.",
    onboardingFields: ["name", "city", "hours", "menu", "deliveryArea"],
    sectionTypes: ["hero", "menu_preview", "faq", "gallery", "contact"],
  },
  {
    code: "barber",
    label: "Barber",
    category: "service",
    primaryModule: "appointments",
    defaultCtaLabel: "Prenota taglio",
    summary: "Servizi prenotabili con slot, staff e disponibilita.",
    onboardingFields: ["name", "city", "hours", "services", "staff"],
    sectionTypes: ["hero", "services", "faq", "gallery", "contact"],
  },
  {
    code: "beauty",
    label: "Beauty",
    category: "service",
    primaryModule: "appointments",
    defaultCtaLabel: "Prenota trattamento",
    summary: "Centro estetico con servizi, durate e agenda appuntamenti.",
    onboardingFields: ["name", "city", "hours", "services", "staff"],
    sectionTypes: ["hero", "services", "gallery", "faq", "contact"],
  },
  {
    code: "bnb",
    label: "B&B",
    category: "stays",
    primaryModule: "stays",
    defaultCtaLabel: "Verifica disponibilita",
    summary: "Struttura light con camere, regole base e richiesta soggiorno.",
    onboardingFields: ["name", "city", "rooms", "contacts", "policies"],
    sectionTypes: ["hero", "rooms", "faq", "gallery", "contact"],
  },
  {
    code: "hotel_light",
    label: "Hotel Light",
    category: "stays",
    primaryModule: "stays",
    defaultCtaLabel: "Prenota soggiorno",
    summary: "Struttura ricettiva con camere, disponibilita e richiesta diretta.",
    onboardingFields: ["name", "city", "rooms", "contacts", "policies"],
    sectionTypes: ["hero", "highlights", "rooms", "gallery", "contact"],
  },
  {
    code: "taxi_ncc",
    label: "Taxi / NCC",
    category: "mobility",
    primaryModule: "mobility_request",
    defaultCtaLabel: "Richiedi trasporto",
    summary: "Modulo richiesta corsa per operatori locali senza dispatch hard realtime.",
    onboardingFields: ["name", "city", "serviceArea", "hours", "contacts"],
    sectionTypes: ["hero", "transport", "faq", "contact"],
  },
  {
    code: "rental",
    label: "Rental",
    category: "rental",
    primaryModule: "rentals",
    defaultCtaLabel: "Prenota noleggio",
    summary: "Noleggio con item, durata, disponibilita e riconsegna.",
    onboardingFields: ["name", "city", "inventory", "hours", "contacts"],
    sectionTypes: ["hero", "highlights", "gallery", "faq", "contact"],
  },
  {
    code: "service",
    label: "Service",
    category: "service",
    primaryModule: "directory",
    defaultCtaLabel: "Contatta attivita",
    summary: "Template generalista per attivita locali non ancora verticalizzate.",
    onboardingFields: ["name", "city", "hours", "contacts", "description"],
    sectionTypes: ["hero", "highlights", "faq", "contact"],
  },
  {
    code: "custom",
    label: "Custom",
    category: "custom",
    primaryModule: "directory",
    defaultCtaLabel: "Scopri di piu",
    summary: "Base flessibile per onboarding manuale o verticale futuro.",
    onboardingFields: ["name", "city", "contacts", "description"],
    sectionTypes: ["hero", "highlights", "contact"],
  },
] as const satisfies readonly BusinessTemplateDefinition[];

export const BUSINESS_TEMPLATE_MAP = createLookup(BUSINESS_TEMPLATE_DEFINITIONS);

export function getTemplateDefinition(code: TemplateCode) {
  return BUSINESS_TEMPLATE_MAP[code];
}

export function getTemplatesByCategory(category: TemplateCategory) {
  return BUSINESS_TEMPLATE_DEFINITIONS.filter((definition) => definition.category === category);
}

export function isTemplateCode(value: string): value is TemplateCode {
  return TEMPLATE_CODES.includes(value as TemplateCode);
}

export function isModuleCode(value: string): value is ModuleCode {
  return MODULE_CODES.includes(value as ModuleCode);
}
