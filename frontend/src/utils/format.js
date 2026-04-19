import { MENU_CATEGORY_OPTIONS, MENU_SECTIONS } from "../constants";
export function todayISO() {
  return toLocalISODate(new Date());
}

export function addDaysISO(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toLocalISODate(date);
}

export function isClosedDate(date) {
  return new Date(`${date}T12:00:00`).getDay() === 1;
}

export function nextOpenDates(count) {
  const dates = [];
  let offset = 0;

  while (dates.length < count && offset < 21) {
    const date = addDaysISO(offset);
    if (!isClosedDate(date)) dates.push(date);
    offset += 1;
  }

  return dates;
}

export function toLocalISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(date) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

export function money(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value || 0);
}

export function formatDateTime(value) {
  if (!value) return "N/D";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function minutesUntilPickup(order) {
  // Usato dal pannello admin per evidenziare ordini vicini al ritiro.
  if (!order?.pickupDate || !order?.pickupTime) return Number.POSITIVE_INFINITY;
  return Math.round(
    (new Date(`${order.pickupDate}T${order.pickupTime}:00`) - new Date()) /
      60000,
  );
}

export function isFreshOrder(order) {
  if (order.status !== "preparing" || !order.createdAt) return false;
  return Date.now() - new Date(order.createdAt).getTime() < 10 * 60 * 1000;
}

export function isUrgentOrder(order) {
  const minutes = minutesUntilPickup(order);
  return (
    order.status !== "done" &&
    order.status !== "cancelled" &&
    Number.isFinite(minutes) &&
    minutes <= 15
  );
}

export function getMenuSectionId(item) {
  // Mappa categorie storiche e nuove in sezioni UX stabili per il menu pubblico.
  const category = String(item.category || "")
    .trim()
    .toLowerCase();
  const text = `${item.name || ""} ${item.description || ""}`.toLowerCase();

  const categoryMap = {
    pizza: "pizze-tonde",
    "pizze-tonde": "pizze-tonde",
    "pizza-teglia": "pizza-teglia",
    "pizza-speciali": "pizza-speciali",
    fritti: "fritti",
    drink: "bevande",
    bevande: "bevande",
    dessert: "altro",
    dolci: "altro",
    extra: "altro",
  };

  if (categoryMap[category]) return categoryMap[category];

  if (
    /\b(speciale|speciali|mortazza|burrata|stracciatella|guanciale|crema di zucca|pecorino)\b/.test(
      text,
    )
  ) {
    return "pizza-speciali";
  }
  if (/\b(teglia|trancio|taglio|pala)\b/.test(text)) return "pizza-teglia";
  if (
    /\b(fritti|fritto|suppli|supplÃ¬|arancino|crocche|crocchetta|patatine|patatina|olive ascolane)\b/.test(
      text,
    )
  ) {
    return "fritti";
  }
  if (
    /\b(drink|bevande|bibite|acqua|coca cola|coca|cola|fanta|sprite|birra|vino)\b/.test(
      text,
    )
  ) {
    return "bevande";
  }
  if (
    /\b(pizza|margherita|diavola|formaggi|prosciutto|napoli|capricciosa)\b/.test(
      text,
    )
  ) {
    return "pizze-tonde";
  }

  return "altro";
}

export function itemMatchesQuickFilter(item, filterId) {
  // Filtri rapidi solo lato client: migliorano la consultazione senza cambiare
  // query o struttura dati sul backend.
  const text = `${item.name || ""} ${item.description || ""} ${(
    item.tags || []
  ).join(" ")} ${(item.allergens || []).join(" ")}`.toLowerCase();

  if (filterId === "vegetariana") {
    return /(vegetariana|vegana|margherita|marinara|ortolana|formaggi|patate)/.test(
      text,
    );
  }
  if (filterId === "piccante")
    return /(piccante|diavola|nduja|peperoncino)/.test(text);
  if (filterId === "senza-lattosio") {
    return !(item.allergens || []).some((allergen) =>
      /latte|lattosio/.test(String(allergen).toLowerCase()),
    );
  }
  if (filterId === "novita") return Boolean(item.featured);
  if (filterId === "piu-ordinati") return Boolean(item.featured);
  return true;
}

export function getSlotHint(slot) {
  // Microcopy per comunicare capacita dello slot senza mostrare numeri tecnici.
  if (slot.almostFull) return "Ultimi orari";
  if (slot.count === 0) return "Consigliato";
  return "Buona scelta";
}

export function isCounterOpenNow() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= 17 * 60 + 30 && minutes <= 22 * 60 + 30;
}

export function orderTrackingHref(orderId) {
  const pathname = typeof window === "undefined" ? "" : window.location.pathname;
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  const reserved = new Set(["admin", "ordine", "p"]);
  const base = firstSegment && !reserved.has(firstSegment) ? `/${firstSegment}` : "";
  return `${base || ""}?ordine=${encodeURIComponent(orderId)}`;
}

export function parseCommaList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function menuItemToForm(item) {
  // Converte un documento menu nel form admin mantenendo fallback per dati legacy.
  return {
    name: item.name || "",
    description: item.description || "",
    price: item.price ?? "",
    category: getAdminMenuCategory(item),
    emoji: item.emoji || "ðŸ•",
    imageUrl: item.imageUrl || "",
    sortOrder: item.sortOrder ?? "",
    unit: item.unit || "trancio",
    tags: (item.tags || []).join(", "),
    allergens: (item.allergens || []).join(", "),
    featured: Boolean(item.featured),
  };
}

export function getAdminMenuCategory(item) {
  const category = String(item.category || "")
    .trim()
    .toLowerCase();
  if (category === "pizza") return "pizze-tonde";
  if (category === "drink") return "bevande";
  if (category === "dessert") return "dolci";
  if (MENU_CATEGORY_OPTIONS.some((option) => option.value === category)) {
    return category;
  }
  return "extra";
}

export function menuFormToPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    price: Number(form.price),
    category: form.category,
    emoji: form.emoji.trim() || "ðŸ•",
    imageUrl: form.imageUrl.trim(),
    sortOrder: Number(form.sortOrder) || 0,
    unit: form.unit,
    tags: parseCommaList(form.tags),
    allergens: parseCommaList(form.allergens),
    featured: Boolean(form.featured),
  };
}

export function businessToForm(business) {
  // Converte Business + owner aggregato nel form piatto del pannello globale.
  return {
    name: business.name || "",
    slug: business.slug || "",
    type: business.type || "custom",
    plan: business.plan || "free",
    subscriptionStatus: business.subscriptionStatus || "trialing",
    publicName: business.branding?.publicName || business.name || "",
    publicUrl: business.deployment?.publicUrl || "",
    vercelProjectName: business.deployment?.vercelProjectName || business.slug || "",
    apiBaseUrl: business.deployment?.apiBaseUrl || "",
    primaryColor: business.branding?.primaryColor || "#2C5F2E",
    accentColor: business.branding?.accentColor || "#C0392B",
    openingHours: business.settings?.openingHours || "Mar-Dom 18:00-22:30",
    publicMessage: business.settings?.publicMessage || "",
    ownerName: business.owner?.name || "",
    ownerEmail: business.owner?.email || "",
    ownerPassword: "",
    ordering: business.features?.ordering !== false,
    customPizza: Boolean(business.features?.customPizza),
    coupons: business.features?.coupons !== false,
    booking: Boolean(business.features?.booking),
    rental: Boolean(business.features?.rental),
  };
}

export function businessFormToPayload(form) {
  // Ricompone il form globale in payload API con sezioni Business annidate.
  const slug = slugify(form.slug || form.name);
  return {
    name: form.name.trim(),
    slug,
    type: form.type,
    plan: form.plan,
    subscriptionStatus: form.subscriptionStatus,
    branding: {
      publicName: form.publicName.trim() || form.name.trim(),
      primaryColor: form.primaryColor,
      accentColor: form.accentColor,
      logoUrl: "",
    },
    deployment: {
      publicUrl: form.publicUrl.trim(),
      vercelProjectName: form.vercelProjectName.trim() || slug,
      apiBaseUrl: form.apiBaseUrl.trim(),
      notes: `Vercel: VITE_BUSINESS_SLUG=${slug}`,
    },
    features: {
      ordering: Boolean(form.ordering),
      customPizza: Boolean(form.customPizza),
      coupons: Boolean(form.coupons),
      booking: Boolean(form.booking),
      rental: Boolean(form.rental),
      analytics: true,
      customerAccounts: true,
    },
    owner:
      form.ownerEmail.trim() || form.ownerName.trim() || form.ownerPassword.trim()
        ? {
            name: form.ownerName.trim(),
            email: form.ownerEmail.trim(),
            password: form.ownerPassword.trim(),
          }
        : undefined,
    seedTemplate: Boolean(form.seedTemplate),
    settings: {
      timezone: "Europe/Rome",
      currency: "EUR",
      locale: "it-IT",
      openingHours: form.openingHours.trim(),
      publicMessage: form.publicMessage.trim(),
    },
  };
}



