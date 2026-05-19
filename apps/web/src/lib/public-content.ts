import type { PublicBusinessDetail, PublicCitySurfaceData } from "./public-runtime";

type CityPageContent = {
  toneLabel: string;
  title: string;
  accentNote: string;
  degradedLabel: string;
  degradedTitle: string;
  degradedBody: string;
  quickView: string;
  quickTitle: string;
  quickBody: string;
  neighborhoodsLabel: string;
  neighborhoodsTitle: string;
  neighborhoodsBody: string;
  featuredLabel: string;
  featuredTitle: string;
  featuredBody: string;
  openBusiness: string;
  noBusinessesLabel: string;
  noBusinessesTitle: string;
  noBusinessesBody: string;
  requestedLabel: string;
  requestedTitle: string;
  openingLabel: string;
  openingTitle: string;
  openingBody: string;
  actionRules: Array<{ title: string; body: string }>;
  zone: string;
  time: string;
  status: string;
};

type BusinessPageContent = {
  toneLabel: string;
  accentNote: string;
  syncingLabel: string;
  syncingTitle: string;
  syncingBody: string;
  quickDecision: string;
  quickDecisionTitle: string;
  area: string;
  context: string;
  response: string;
  activeModule: string;
  activeModuleTitle: string;
  activeModuleBody: string;
  chooseWhy: string;
  rightMoments: string;
  publicShape: string;
  publicShapeTitle: string;
  publicShapeBody: string;
  practicalInfo: string;
  practicalTitle: string;
  practicalBody: string;
  backToCity: string;
  faq: string;
  faqTitle: string;
};

type AccountPageContent = {
  toneLabel: string;
  title: string;
  description: string;
  accentNote: string;
  cards: Array<{ title: string; body: string }>;
};

export function buildAccountPageContent(): AccountPageContent {
  return {
    toneLabel: "Area account",
    title: "Uno spazio personale pulito, leggibile e separato dalla console operativa.",
    description:
      "Richieste, preferiti, recapiti e storico dei contatti devono restare semplici da capire anche da telefono.",
    accentNote:
      "L'utente finale non deve mai sentirsi dentro un pannello travestito: tutto deve sembrare utile, calmo e immediato.",
    cards: [
      {
        title: "Profilo",
        body: "Dati account, preferenze, recapiti e consensi in un unico punto chiaro.",
      },
      {
        title: "Attivita seguite",
        body: "Business, richieste e pagine salvate organizzati per citta e contesto.",
      },
      {
        title: "Prossimi strumenti",
        body: "Preferiti, notifiche locali e identita cross-city senza rumore.",
      },
    ],
  };
}

export function buildCityPageContent(city: PublicCitySurfaceData["city"]): CityPageContent {
  return {
    toneLabel: "Piazza locale",
    title: `${city.name}: attivita locali facili da capire e ancora piu facili da scegliere.`,
    accentNote: `${city.claim} Il punto non e riempire la pagina di box, ma orientare l'utente verso il contesto giusto con piu fiducia e meno attrito.`,
    degradedLabel: "Catalogo in riallineamento",
    degradedTitle: "La pagina resta leggibile anche mentre i dati live si completano.",
    degradedBody:
      "La struttura mobile-first non cambia: alcuni contenuti possono arrivare da fallback editoriali, ma il percorso pubblico resta coerente.",
    quickView: "Vista rapida",
    quickTitle: "Le categorie che contano davvero in questa citta",
    quickBody:
      "Da mobile devono essere immediate: business, richieste, soggiorni, eventi e servizi locali, senza costringere l'utente a interpretare troppo.",
    neighborhoodsLabel: "Contesto",
    neighborhoodsTitle: "Orientamento locale, non catalogo astratto",
    neighborhoodsBody:
      "Centro, quartieri chiave e segnali utili servono a dare direzione. La pagina citta deve aiutare a capire dove guardare prima.",
    featuredLabel: "In evidenza",
    featuredTitle:
      city.businessCount > 0
        ? `${city.businessCount} attivita pubbliche gia leggibili in CityCore`
        : "Una pagina citta pronta ad accogliere le prime attivita attive",
    featuredBody:
      "Ogni scheda deve comunicare identita, contesto e prossimo passo in pochi secondi, soprattutto da telefono.",
    openBusiness: "Apri attivita",
    noBusinessesLabel: "Catalogo in partenza",
    noBusinessesTitle: "La citta e pronta, il catalogo pubblico si sta popolando.",
    noBusinessesBody:
      "La surface CityCore regge bene anche la fase iniziale: contesto chiaro, tono credibile e spazio per accogliere nuovi business senza scorciatoie provvisorie.",
    requestedLabel: "Azioni rapide",
    requestedTitle: "Le cose che devono restare immediate",
    openingLabel: "Crescita ordinata",
    openingTitle: "Una pagina pronta a espandersi senza diventare rumorosa",
    openingBody:
      "La griglia puo ospitare nuovi business, ma la gerarchia resta semplice: card chiare, filtri utili e nessuna sidebar inutile.",
    actionRules: [
      {
        title: "Capisci subito il contesto.",
        body: "La citta deve dichiarare tono, categorie e perche vale la pena restare.",
      },
      {
        title: "Apri poche opzioni chiare.",
        body: "Meglio poche scelte leggibili che una directory infinita senza gerarchia.",
      },
      {
        title: "Passa all'azione senza attrito.",
        body: "Ogni card deve portare a un business o a un contenuto davvero utile.",
      },
    ],
    zone: "Zona",
    time: "Tempo",
    status: "Stato",
  };
}

export function buildBusinessPageContent(
  business: PublicBusinessDetail,
  cityName: string,
  moduleLabel: string,
): BusinessPageContent {
  return {
    toneLabel: "Scheda attivita",
    accentNote: `${business.trustLine} La CTA principale deve restare visibile presto, mentre tutto il resto la sostiene senza coprirla.`,
    syncingLabel: "Scheda in sincronizzazione",
    syncingTitle: "Il layout pubblico resta leggibile anche se i dati live non sono completi.",
    syncingBody:
      "La pagina continua a usare la stessa gerarchia finale: alcuni dettagli possono arrivare dal fallback editoriale, ma l'esperienza resta credibile.",
    quickDecision: "Decisione rapida",
    quickDecisionTitle: "Le informazioni che servono prima di tutto",
    area: "Zona",
    context: "Contesto",
    response: "Risposta",
    activeModule: "Modulo attivo",
    activeModuleTitle: `${moduleLabel} come centro della pagina`,
    activeModuleBody:
      "La CTA primaria non vive in un box secondario: sta al centro del percorso e rende il passo successivo chiaro gia nei primi secondi.",
    chooseWhy: "Perche scegliere questa attivita",
    rightMoments: "Momenti giusti",
    publicShape: "Forma pubblica",
    publicShapeTitle: "Un sito business leggibile, modulare e pronto a crescere",
    publicShapeBody:
      "Ogni business unisce identita, contenuti, contatti e modulo principale dentro una struttura coerente con la citta e con il core piattaforma.",
    practicalInfo: "Informazioni pratiche",
    practicalTitle: "Dove si trova, come contattarla e cosa aspettarti",
    practicalBody: `${business.addressLine}. Contatto principale ${business.secondaryAction.label}. La pagina mette questi dati prima del rumore e li rende leggibili in un solo scroll.`,
    backToCity: `Torna a ${cityName}`,
    faq: "FAQ",
    faqTitle: "Risposte veloci, senza costringere l'utente a cercare altrove",
  };
}
