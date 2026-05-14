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
  menuPreview: string;
  menuLive: string;
  menuFallback: string;
  menuBody: string;
  propositionsSuffix: string;
  catalogBuilding: string;
  catalogBuildingTitle: string;
  catalogBuildingBody: string;
  practicalInfo: string;
  practicalTitle: string;
  practicalBody: string;
  backToCity: string;
  faq: string;
  faqTitle: string;
};

type TrackingPageContent = {
  toneLabel: string;
  title: string;
  description: string;
  statusNow: string;
  pickupLabel: string;
  totalLabel: string;
  source: string;
  payment: string;
  customer: string;
  quickActions: string;
  quickTitle: string;
  quickBody: string;
  backToMenu: string;
  refreshStatus: string;
  noNotes: string;
  pending: string;
  confirmed: string;
  preparing: string;
  ready: string;
  completed: string;
  cancelled: string;
  unknownPickup: string;
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
    toneLabel: "Area cliente",
    title: "Uno spazio personale pulito, leggibile e separato dal banco operativo.",
    description:
      "Richieste, ordini, preferiti e storico cliente devono restare semplici da capire anche da telefono, senza assorbire il tono della console admin.",
    accentNote:
      "L'utente finale non deve mai sentirsi dentro un pannello travestito: tutto deve sembrare utile, calmo e immediato.",
    cards: [
      {
        title: "Profilo",
        body: "Dati account, preferenze, recapiti e consensi in un unico punto chiaro.",
      },
      {
        title: "Storico",
        body: "Ordini, richieste e prenotazioni organizzati per citta e attivita.",
      },
      {
        title: "Prossimi strumenti",
        body: "Preferiti, wallet locale, promemoria e identita cross-city senza rumore.",
      },
    ],
  };
}

export function buildCityPageContent(city: PublicCitySurfaceData["city"]): CityPageContent {
  return {
    toneLabel: "Piazza locale",
    title: `${city.name}: attivita locali facili da capire e ancora piu facili da scegliere.`,
    accentNote: `${city.claim} Il punto non e riempire la pagina di box, ma orientare l'utente verso l'attivita giusta con piu fiducia e meno attrito.`,
    degradedLabel: "Catalogo in riallineamento",
    degradedTitle: "La pagina resta leggibile anche mentre i dati live si completano.",
    degradedBody:
      "La struttura mobile-first non cambia: alcuni contenuti possono arrivare da fallback editoriali, ma il percorso pubblico resta coerente.",
    quickView: "Vista rapida",
    quickTitle: "Le categorie che contano davvero in questa citta",
    quickBody:
      "Da mobile devono essere immediate: attivita, richieste, prenotazioni, soggiorni o servizi locali, senza costringere l'utente a interpretare troppo.",
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
      "Ogni scheda deve comunicare identita, contesto e promessa operativa in pochi secondi, soprattutto da telefono.",
    openBusiness: "Apri attivita",
    noBusinessesLabel: "Catalogo in partenza",
    noBusinessesTitle: "La citta e pronta, il catalogo pubblico si sta popolando.",
    noBusinessesBody:
      "La surface CityCore regge bene anche la fase iniziale: contesto chiaro, tono credibile e spazio per accogliere nuovi business senza rumore o scorciatoie provvisorie.",
    requestedLabel: "Azioni rapide",
    requestedTitle: "Le cose che devono restare immediate",
    openingLabel: "Crescita ordinata",
    openingTitle: "Una pagina pronta a espandersi senza diventare rumorosa",
    openingBody:
      "La griglia puo ospitare nuovi business, ma la gerarchia resta semplice: card chiare, filtri utili e nessuna sidebar inutile.",
    actionRules: [
      {
        title: "Ordina o prenota.",
        body: "La CTA principale deve stare sopra la piega.",
      },
      {
        title: "Capisci tempi e zona.",
        body: "Prima dei dettagli lunghi e prima delle FAQ.",
      },
      {
        title: "Confronta poche opzioni.",
        body: "Meglio tre scelte chiare che venti senza gerarchia.",
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
    menuPreview: "Preview menu",
    menuLive: "Il menu pubblico e gia collegato alla piattaforma attiva",
    menuFallback: "La struttura menu e pronta ad agganciarsi ai dati live",
    menuBody:
      "Il catalogo ordering parte da categorie e proposte leggibili, pensate per vivere bene da mobile e convertire senza attrito.",
    propositionsSuffix: "proposte gia esposte dalla nuova API ordering.",
    catalogBuilding: "Catalogo in costruzione",
    catalogBuildingTitle: "Il business usa ordering, ma il menu V2 non e ancora popolato.",
    catalogBuildingBody:
      "La surface pubblica e gia pronta: appena arrivano le prime voci, il menu entra in pagina senza cambiare esperienza o tono.",
    practicalInfo: "Informazioni pratiche",
    practicalTitle: "Dove si trova, come contattarla e cosa aspettarti",
    practicalBody: `${business.addressLine}. Contatto principale ${business.secondaryAction.label}. La pagina mette questi dati prima del rumore e li rende leggibili in un solo scroll.`,
    backToCity: `Torna a ${cityName}`,
    faq: "FAQ",
    faqTitle: "Risposte veloci, senza costringere l'utente a cercare altrove",
  };
}

export function buildTrackingPageContent(businessName: string): TrackingPageContent {
  return {
    toneLabel: "Tracking ordine",
    title: `${businessName}: stato ordine sempre leggibile`,
    description:
      "Il tracking pubblico e gia collegato al flusso ordering attivo. Il cliente puo seguire il proprio ordine in modo chiaro, stabile e leggibile.",
    statusNow: "Stato attuale",
    pickupLabel: "Ritiro previsto",
    totalLabel: "Totale",
    source: "Fonte",
    payment: "Pagamento",
    customer: "Cliente",
    quickActions: "Azioni rapide",
    quickTitle: "Tracking chiaro, in un solo percorso",
    quickBody:
      "Puoi aggiornare la pagina per vedere eventuali cambi di stato o tornare al menu del business senza interrompere il flusso.",
    backToMenu: "Torna al menu",
    refreshStatus: "Aggiorna stato",
    noNotes: "Nessuna nota per questo articolo.",
    pending: "In attesa",
    confirmed: "Confermato",
    preparing: "In preparazione",
    ready: "Pronto",
    completed: "Completato",
    cancelled: "Annullato",
    unknownPickup: "Da confermare",
  };
}
