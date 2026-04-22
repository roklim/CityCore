// Etichette operative condivise tra tracking cliente e pannello admin.
export const STATUSES = {
  preparing: "Preparazione",
  ready: "Pronto",
  done: "Ritirato",
  cancelled: "Annullato",
};
export const ADMIN_NAV = [
  { id: "dashboard", label: "Oggi" },
  { id: "orders", label: "Ordini" },
  { id: "menu", label: "Menu" },
  { id: "availability", label: "Disponibilita" },
  { id: "customers", label: "Clienti" },
  { id: "settings", label: "Impostazioni" },
];
export const ORDER_FILTERS = [
  { id: "all", label: "Tutti" },
  { id: "new", label: "Nuovi" },
  { id: "preparing", label: "Preparazione" },
  { id: "ready", label: "Pronti" },
  { id: "done", label: "Ritirati" },
  { id: "cancelled", label: "Annullati" },
];
export const PUBLIC_STATUS_LABELS = {
  preparing: "In preparazione",
  ready: "Pronto al banco",
  done: "Completato",
  cancelled: "Annullato",
};
export const ADMIN_REFRESH_INTERVAL_MS = 120000;
export const LOYALTY_GOAL = 10;

// Opzioni di menu pensate per il primo verticale food/takeaway. I valori
// rimangono compatibili col backend esistente e con i dati gia' salvati.
export const MENU_CATEGORY_OPTIONS = [
  { value: "pizza-teglia", label: "Tranci e Teglie" },
  { value: "pizze-tonde", label: "Pizze Tonde" },
  { value: "pizza-speciali", label: "Tonde Speciali" },
  { value: "fritti", label: "Fritti" },
  { value: "bevande", label: "Bevande" },
  { value: "dolci", label: "Dolci" },
  { value: "extra", label: "Extra Banco" },
];
export const MENU_UNIT_OPTIONS = [
  "pezzo",
  "porzione",
  "trancio",
  "teglia",
  "lattina",
  "bottiglia",
];
export const OPENING_DAY_OPTIONS = [
  { id: "lun", label: "Lun", fullLabel: "Lunedi" },
  { id: "mar", label: "Mar", fullLabel: "Martedi" },
  { id: "mer", label: "Mer", fullLabel: "Mercoledi" },
  { id: "gio", label: "Gio", fullLabel: "Giovedi" },
  { id: "ven", label: "Ven", fullLabel: "Venerdi" },
  { id: "sab", label: "Sab", fullLabel: "Sabato" },
  { id: "dom", label: "Dom", fullLabel: "Domenica" },
];
export const EMPTY_MENU_FORM = {
  name: "",
  description: "",
  price: "",
  category: "pizze-tonde",
  emoji: "\u{1F355}",
  imageUrl: "",
  sortOrder: "",
  unit: "trancio",
  tags: "",
  allergens: "",
  featured: false,
};
export const EMPTY_BUSINESS_FORM = {
  name: "",
  slug: "",
  type: "pizzeria",
  plan: "free",
  subscriptionStatus: "trialing",
  cityId: "",
  citySlug: "cagli",
  cityName: "Cagli",
  province: "PU",
  region: "Marche",
  address: "",
  publicName: "",
  logoUrl: "",
  coverImageUrl: "",
  publicUrl: "",
  vercelProjectName: "",
  apiBaseUrl: "",
  primaryColor: "#2C5F2E",
  accentColor: "#C0392B",
  openingHours: "Mar-Dom 18:00-22:30",
  openingDays: ["mar", "mer", "gio", "ven", "sab", "dom"],
  openingTimeStart: "18:00",
  openingTimeEnd: "22:30",
  publicMessage: "",
  ownerName: "",
  ownerEmail: "",
  ownerPassword: "",
  ordering: true,
  seedTemplate: true,
  customPizza: false,
  coupons: true,
  booking: false,
  rental: false,
};

// Configurazione base dei tenant gestiti dal global admin. I moduli booking e
// rental sono feature flag/scaffold: non vengono mostrati come UI completa oggi.
export const BUSINESS_TYPE_OPTIONS = [
  { value: "pizzeria", label: "Pizzeria" },
  { value: "sushi", label: "Sushi" },
  { value: "restaurant", label: "Ristorante/asporto" },
  { value: "bar", label: "Bar" },
  { value: "bike_rental", label: "Noleggio bici" },
  { value: "service", label: "Servizi/appuntamenti" },
  { value: "custom", label: "Custom" },
];
export const PLAN_OPTIONS = ["free", "pro", "premium"];
export const SUBSCRIPTION_STATUS_OPTIONS = [
  "trialing",
  "active",
  "past_due",
  "cancelled",
];
export const BUSINESS_USER_ROLES = ["owner", "admin", "staff"];
export const EMPTY_BUSINESS_USER_FORM = {
  name: "",
  email: "",
  password: "",
  role: "admin",
  active: true,
};

// Sezioni visuali del menu pubblico. getMenuSectionId mappa categorie legacy e
// nuove categorie in questi blocchi leggibili per il cliente.
export const MENU_SECTIONS = [
  {
    id: "pizza-teglia",
    title: "Tranci e Teglie",
    eyebrow: "Banco caldo",
    description:
      "Pizza al taglio, pezzi pronti e teglie da ordinare per l'asporto.",
  },
  {
    id: "pizze-tonde",
    title: "Pizze Tonde",
    eyebrow: "Su richiesta",
    description: "Le tonde classiche quando disponibili in menu.",
  },
  {
    id: "pizza-speciali",
    title: "Tonde Speciali",
    eyebrow: "Dal forno",
    description: "Ricette piu ricche, comode da ordinare in anticipo.",
  },
  {
    id: "fritti",
    title: "Fritti Caldi",
    eyebrow: "Dal banco",
    description: "Suppli, patatine e sfizi dorati da aggiungere al sacchetto.",
  },
  {
    id: "bevande",
    title: "Bibite Fresche",
    eyebrow: "Frigo",
    description: "Acqua, lattine e birre fredde per completare l'asporto.",
  },
  {
    id: "altro",
    title: "Dolci e Extra",
    eyebrow: "Fine banco",
    description: "Dolci, salse e piccole aggiunte disponibili oggi.",
  },
];
export const QUICK_FILTERS = [
  { id: "vegetariana", label: "Vegetariana" },
  { id: "piccante", label: "Piccante" },
  { id: "senza-lattosio", label: "Senza lattosio" },
  { id: "novita", label: "Novita" },
  { id: "piu-ordinati", label: "Piu richiesti" },
];
export const ORDER_STATUS_STEPS = ["preparing", "ready", "done"];

// Configuratore pizza su misura frontend-only: resta separato dal DB per non
// complicare Milestone 2, ma produce item carrello compatibili con gli ordini.
export const CUSTOM_PIZZA_BASES = [
  {
    id: "rossa",
    name: "Base rossa",
    description: "Pomodoro della casa",
    price: 6.5,
  },
  {
    id: "bianca",
    name: "Base bianca",
    description: "Mozzarella e olio EVO",
    price: 7,
  },
  {
    id: "margherita",
    name: "Base Margherita",
    description: "Pomodoro, mozzarella e basilico",
    price: 8,
  },
];
export const CUSTOM_PIZZA_TOPPINGS = [
  { id: "mozzarella-extra", name: "Mozzarella extra", price: 1.5 },
  { id: "bufala", name: "Bufala", price: 2.5 },
  { id: "prosciutto-cotto", name: "Prosciutto cotto", price: 2 },
  { id: "salame-piccante", name: "Salame piccante", price: 2 },
  { id: "salsiccia", name: "Salsiccia", price: 2 },
  { id: "funghi", name: "Funghi", price: 1.5 },
  { id: "olive", name: "Olive", price: 1 },
  { id: "carciofini", name: "Carciofini", price: 1.5 },
  { id: "cipolla", name: "Cipolla", price: 1 },
  { id: "rucola", name: "Rucola", price: 1 },
  { id: "patate", name: "Patate", price: 1.5 },
  { id: "gorgonzola", name: "Gorgonzola", price: 1.5 },
  { id: "nduja", name: "Nduja", price: 2 },
  { id: "basilico", name: "Basilico", price: 0.5 },
];
export const CUSTOM_PIZZA_MAX_TOPPINGS = 6;


