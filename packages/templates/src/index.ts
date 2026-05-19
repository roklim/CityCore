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
  | "story"
  | "services"
  | "gallery"
  | "faq"
  | "contact"
  | "featured"
  | "form";

export type ModuleDefinition = {
  code: ModuleCode;
  label: string;
  summary: string;
  operationalFocus: string;
};

export const MODULE_DEFINITIONS = [
  {
    code: "content",
    label: "Content",
    summary: "Pagine, blocchi editoriali e storytelling pubblico.",
    operationalFocus: "Presentazione e contenuti.",
  },
  {
    code: "catalog",
    label: "Catalog",
    summary: "Schede, servizi, collezioni e offerte strutturate.",
    operationalFocus: "Catalogo e informazioni consultabili.",
  },
  {
    code: "forms_inbox",
    label: "Forms Inbox",
    summary: "Richieste, lead, preventivi e contatti in ingresso.",
    operationalFocus: "Inbound e gestione richieste.",
  },
  {
    code: "booking",
    label: "Booking",
    summary: "Prenotazioni e disponibilita come scaffold di modulo.",
    operationalFocus: "Agenda, slot e conferme.",
  },
  {
    code: "hospitality",
    label: "Hospitality",
    summary: "Disponibilita soggiorni e richieste struttura come scaffold.",
    operationalFocus: "Permanenze, camere e richieste.",
  },
  {
    code: "listings",
    label: "Listings",
    summary: "Annunci, vetrine e pubblicazioni locali.",
    operationalFocus: "Pubblicazione e stato listing.",
  },
  {
    code: "directory",
    label: "Directory",
    summary: "Discovery locale e presenza pubblica non transazionale.",
    operationalFocus: "Scheda pubblica e discovery.",
  },
  {
    code: "events",
    label: "Events",
    summary: "Programmazione, promozione e agenda territoriale.",
    operationalFocus: "Calendario e attivazioni.",
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
    code: "local_business",
    label: "Local Business",
    category: "commerce",
    primaryModule: "catalog",
    defaultCtaLabel: "Esplora il business",
    summary: "Template base per attivita locali con catalogo, contenuti e contatti.",
    onboardingFields: ["name", "city", "hours", "contacts", "catalog"],
    sectionTypes: ["hero", "highlights", "gallery", "faq", "contact"],
  },
  {
    code: "studio_service",
    label: "Studio Service",
    category: "service",
    primaryModule: "booking",
    defaultCtaLabel: "Richiedi disponibilita",
    summary: "Template per professionisti e studi con contenuti, servizi e richieste.",
    onboardingFields: ["name", "city", "hours", "services", "contacts"],
    sectionTypes: ["hero", "services", "story", "faq", "contact"],
  },
  {
    code: "hospitality",
    label: "Hospitality",
    category: "hospitality",
    primaryModule: "hospitality",
    defaultCtaLabel: "Scopri la struttura",
    summary: "Template per strutture con galleria, informazioni pratiche e richieste.",
    onboardingFields: ["name", "city", "rooms", "policies", "contacts"],
    sectionTypes: ["hero", "highlights", "gallery", "faq", "contact"],
  },
  {
    code: "events_listings",
    label: "Events & Listings",
    category: "editorial",
    primaryModule: "listings",
    defaultCtaLabel: "Apri la vetrina",
    summary: "Template per annunci, eventi e raccolte locali.",
    onboardingFields: ["name", "city", "categories", "contacts", "story"],
    sectionTypes: ["hero", "featured", "highlights", "faq", "contact"],
  },
  {
    code: "custom",
    label: "Custom",
    category: "custom",
    primaryModule: "directory",
    defaultCtaLabel: "Scopri di piu",
    summary: "Base flessibile per onboarding manuale e configurazioni future.",
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
