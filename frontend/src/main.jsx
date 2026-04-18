import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createMenuItem,
  createOrder,
  createCoupon,
  deleteCoupon,
  deleteMenuItem,
  getAdminCustomers,
  getAvailability,
  getAdminMenu,
  getCustomerOrders,
  getCoupons,
  getMenu,
  getOrder,
  getOrderStats,
  getOrders,
  getStoreSettings,
  lookupCustomer,
  loginAdmin,
  toggleCoupon,
  toggleMenuItem,
  updateCoupon,
  updateMenuItem,
  updateOrderStatus,
  updateStoreSettings,
} from "./lib/api";
import "./styles.css";

const STATUSES = {
  preparing: "Preparazione",
  ready: "Pronto",
  done: "Ritirato",
  cancelled: "Annullato",
};
const ADMIN_NAV = [
  { id: "dashboard", label: "Oggi" },
  { id: "orders", label: "Ordini" },
  { id: "menu", label: "Banco/Menu" },
  { id: "availability", label: "Disponibilita" },
  { id: "customers", label: "Clienti" },
  { id: "settings", label: "Impostazioni" },
];
const ORDER_FILTERS = [
  { id: "all", label: "Tutti" },
  { id: "new", label: "Nuovi" },
  { id: "preparing", label: "Preparazione" },
  { id: "ready", label: "Pronti" },
  { id: "done", label: "Ritirati" },
  { id: "cancelled", label: "Annullati" },
];
const PUBLIC_STATUS_LABELS = {
  preparing: "In preparazione",
  ready: "Pronto al banco",
  done: "Completato",
  cancelled: "Annullato",
};
const ADMIN_REFRESH_INTERVAL_MS = 120000;
const LOYALTY_GOAL = 10;
const MENU_CATEGORY_OPTIONS = [
  { value: "pizza-teglia", label: "Tranci e Teglie" },
  { value: "pizze-tonde", label: "Pizze Tonde" },
  { value: "pizza-speciali", label: "Tonde Speciali" },
  { value: "fritti", label: "Fritti" },
  { value: "bevande", label: "Bevande" },
  { value: "dolci", label: "Dolci" },
  { value: "extra", label: "Extra Banco" },
];
const MENU_UNIT_OPTIONS = [
  "pezzo",
  "porzione",
  "trancio",
  "teglia",
  "lattina",
  "bottiglia",
];
const EMPTY_MENU_FORM = {
  name: "",
  description: "",
  price: "",
  category: "pizze-tonde",
  emoji: "🍕",
  imageUrl: "",
  sortOrder: "",
  unit: "trancio",
  tags: "",
  allergens: "",
  featured: false,
};
const MENU_SECTIONS = [
  {
    id: "pizza-teglia",
    title: "Tranci e Teglie",
    eyebrow: "Banco caldo",
    description: "Pizza al taglio, pezzi pronti e teglie da ordinare per l'asporto.",
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
const QUICK_FILTERS = [
  { id: "vegetariana", label: "Vegetariana" },
  { id: "piccante", label: "Piccante" },
  { id: "senza-lattosio", label: "Senza lattosio" },
  { id: "novita", label: "Novita" },
  { id: "piu-ordinati", label: "Piu richiesti" },
];
const ORDER_STATUS_STEPS = ["preparing", "ready", "done"];
const CUSTOM_PIZZA_BASES = [
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
const CUSTOM_PIZZA_TOPPINGS = [
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
const CUSTOM_PIZZA_MAX_TOPPINGS = 6;

function todayISO() {
  return toLocalISODate(new Date());
}

function addDaysISO(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toLocalISODate(date);
}

function isClosedDate(date) {
  return new Date(`${date}T12:00:00`).getDay() === 1;
}

function nextOpenDates(count) {
  const dates = [];
  let offset = 0;

  while (dates.length < count && offset < 21) {
    const date = addDaysISO(offset);
    if (!isClosedDate(date)) dates.push(date);
    offset += 1;
  }

  return dates;
}

function toLocalISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

function money(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value || 0);
}

function formatDateTime(value) {
  if (!value) return "N/D";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function minutesUntilPickup(order) {
  if (!order?.pickupDate || !order?.pickupTime) return Number.POSITIVE_INFINITY;
  return Math.round(
    (new Date(`${order.pickupDate}T${order.pickupTime}:00`) - new Date()) / 60000,
  );
}

function isFreshOrder(order) {
  if (order.status !== "preparing" || !order.createdAt) return false;
  return Date.now() - new Date(order.createdAt).getTime() < 10 * 60 * 1000;
}

function isUrgentOrder(order) {
  const minutes = minutesUntilPickup(order);
  return (
    order.status !== "done" &&
    order.status !== "cancelled" &&
    Number.isFinite(minutes) &&
    minutes <= 15
  );
}

function getMenuSectionId(item) {
  const category = String(item.category || "").trim().toLowerCase();
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

  if (/\b(speciale|speciali|mortazza|burrata|stracciatella|guanciale|crema di zucca|pecorino)\b/.test(text)) {
    return "pizza-speciali";
  }
  if (/\b(teglia|trancio|taglio|pala)\b/.test(text)) return "pizza-teglia";
  if (/\b(fritti|fritto|suppli|supplì|arancino|crocche|crocchetta|patatine|patatina|olive ascolane)\b/.test(text)) {
    return "fritti";
  }
  if (/\b(drink|bevande|bibite|acqua|coca cola|coca|cola|fanta|sprite|birra|vino)\b/.test(text)) {
    return "bevande";
  }
  if (/\b(pizza|margherita|diavola|formaggi|prosciutto|napoli|capricciosa)\b/.test(text)) {
    return "pizze-tonde";
  }

  return "altro";
}

function itemMatchesQuickFilter(item, filterId) {
  const text = `${item.name || ""} ${item.description || ""} ${(
    item.tags || []
  ).join(" ")} ${(item.allergens || []).join(" ")}`.toLowerCase();

  if (filterId === "vegetariana") {
    return /(vegetariana|vegana|margherita|marinara|ortolana|formaggi|patate)/.test(text);
  }
  if (filterId === "piccante") return /(piccante|diavola|nduja|peperoncino)/.test(text);
  if (filterId === "senza-lattosio") {
    return !(item.allergens || []).some((allergen) =>
      /latte|lattosio/.test(String(allergen).toLowerCase()),
    );
  }
  if (filterId === "novita") return Boolean(item.featured);
  if (filterId === "piu-ordinati") return Boolean(item.featured);
  return true;
}

function getSlotHint(slot) {
  if (slot.almostFull) return "Ultimi orari";
  if (slot.count === 0) return "Consigliato";
  return "Buona scelta";
}

function isCounterOpenNow() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= 17 * 60 + 30 && minutes <= 22 * 60 + 30;
}

function orderTrackingHref(orderId) {
  return `/?ordine=${encodeURIComponent(orderId)}`;
}

function parseCommaList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function menuItemToForm(item) {
  return {
    name: item.name || "",
    description: item.description || "",
    price: item.price ?? "",
    category: getAdminMenuCategory(item),
    emoji: item.emoji || "🍕",
    imageUrl: item.imageUrl || "",
    sortOrder: item.sortOrder ?? "",
    unit: item.unit || "trancio",
    tags: (item.tags || []).join(", "),
    allergens: (item.allergens || []).join(", "),
    featured: Boolean(item.featured),
  };
}

function getAdminMenuCategory(item) {
  const category = String(item.category || "").trim().toLowerCase();
  if (category === "pizza") return "pizze-tonde";
  if (category === "drink") return "bevande";
  if (category === "dessert") return "dolci";
  if (MENU_CATEGORY_OPTIONS.some((option) => option.value === category)) {
    return category;
  }
  return "extra";
}

function menuFormToPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    price: Number(form.price),
    category: form.category,
    emoji: form.emoji.trim() || "🍕",
    imageUrl: form.imageUrl.trim(),
    sortOrder: Number(form.sortOrder) || 0,
    unit: form.unit,
    tags: parseCommaList(form.tags),
    allergens: parseCommaList(form.allergens),
    featured: Boolean(form.featured),
  };
}

function Toast({ message }) {
  return <div className={`toast ${message ? "show" : ""}`}>{message}</div>;
}

function CustomerView() {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [pickupDate, setPickupDate] = useState(todayISO());
  const [availability, setAvailability] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [customerOrdersLoading, setCustomerOrdersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeMenuSection, setActiveMenuSection] = useState(MENU_SECTIONS[0].id);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState([]);
  const [addedItemId, setAddedItemId] = useState("");
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [customPizzaOpen, setCustomPizzaOpen] = useState(false);
  const [customPizzaBaseId, setCustomPizzaBaseId] = useState("");
  const [customPizzaToppings, setCustomPizzaToppings] = useState([]);
  const [customPizzaNotes, setCustomPizzaNotes] = useState("");
  const customPizzaRef = useRef(null);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart],
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart],
  );
  const normalizedPhone = useMemo(() => phone.replace(/\D/g, ""), [phone]);
  const customPizzaBase = useMemo(
    () =>
      CUSTOM_PIZZA_BASES.find((base) => base.id === customPizzaBaseId) || null,
    [customPizzaBaseId],
  );
  const customPizzaSelectedToppings = useMemo(
    () =>
      CUSTOM_PIZZA_TOPPINGS.filter((topping) =>
        customPizzaToppings.includes(topping.id),
      ),
    [customPizzaToppings],
  );
  const customPizzaPrice = useMemo(
    () =>
      (customPizzaBase?.price || 0) +
      customPizzaSelectedToppings.reduce(
        (sum, topping) => sum + topping.price,
        0,
      ),
    [customPizzaBase, customPizzaSelectedToppings],
  );

  const dateOptions = useMemo(
    () => nextOpenDates(7),
    [],
  );

  const visibleCustomerSlots = useMemo(
    () => (availability?.slots || []).filter((slot) => !slot.full && !slot.past),
    [availability],
  );

  const filteredMenu = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return menu.filter((item) => {
      const haystack = `${item.name || ""} ${item.description || ""} ${(
        item.tags || []
      ).join(" ")}`.toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const matchesFilters = activeFilters.every((filterId) =>
        itemMatchesQuickFilter(item, filterId),
      );

      return matchesSearch && matchesFilters;
    });
  }, [activeFilters, menu, searchTerm]);

  const menuBySection = useMemo(() => {
    return MENU_SECTIONS.map((section) => ({
      ...section,
      items: filteredMenu.filter((item) => getMenuSectionId(item) === section.id),
    })).filter((section) => section.items.length > 0 || section.id === "pizze-tonde");
  }, [filteredMenu]);

  const activeMenu = useMemo(() => {
    return (
      menuBySection.find((section) => section.id === activeMenuSection) ||
      menuBySection[0]
    );
  }, [activeMenuSection, menuBySection]);
  const loyaltyPoints = customerProfile?.customer?.points || 0;
  const loyaltyCyclePoints =
    loyaltyPoints > 0 && loyaltyPoints % LOYALTY_GOAL === 0
      ? LOYALTY_GOAL
      : loyaltyPoints % LOYALTY_GOAL;
  const loyaltyRemaining = Math.max(LOYALTY_GOAL - loyaltyCyclePoints, 0);

  useEffect(() => {
    getMenu()
      .then(setMenu)
      .catch(() => notify("Menu non disponibile. Riprova tra poco."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeMenu && menuBySection[0]) {
      setActiveMenuSection(menuBySection[0].id);
      return;
    }

    if (
      activeMenu &&
      !menuBySection.some((section) => section.id === activeMenuSection)
    ) {
      setActiveMenuSection(menuBySection[0]?.id || MENU_SECTIONS[0].id);
    }
  }, [activeMenu, activeMenuSection, menuBySection]);

  useEffect(() => {
    if (!dateOptions.includes(pickupDate)) {
      setPickupDate(dateOptions[0] || todayISO());
    }
  }, [dateOptions, pickupDate]);

  useEffect(() => {
    setSelectedSlot("");
    getAvailability(pickupDate)
      .then(setAvailability)
      .catch(() => {
        setAvailability(null);
        notify("Fasce orarie non disponibili.");
      });
  }, [pickupDate]);

  useEffect(() => {
    if (normalizedPhone.length < 6) {
      setCustomerProfile(null);
      setCustomerOrders([]);
      setCustomerOrdersLoading(false);
      return;
    }

    let cancelled = false;
    setCustomerLookupLoading(true);
    setCustomerOrdersLoading(true);

    const timer = window.setTimeout(() => {
      Promise.allSettled([
        lookupCustomer(normalizedPhone),
        getCustomerOrders(normalizedPhone),
      ])
        .then(([profileResult, ordersResult]) => {
          if (cancelled) return;

          if (profileResult.status === "fulfilled") {
            const data = profileResult.value;
            setCustomerProfile(data.found ? data : null);
            if (data.found && data.customer?.name && !customer.trim()) {
              setCustomer(data.customer.name);
            }
          } else {
            setCustomerProfile(null);
          }

          setCustomerOrders(
            ordersResult.status === "fulfilled" ? ordersResult.value : [],
          );
        })
        .finally(() => {
          if (!cancelled) {
            setCustomerLookupLoading(false);
            setCustomerOrdersLoading(false);
          }
        });
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [normalizedPhone]);

  useEffect(() => {
    document.body.classList.toggle("drawer-open", mobileCartOpen);
    return () => document.body.classList.remove("drawer-open");
  }, [mobileCartOpen]);

  function notify(message) {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(""), 2600);
  }

  function addToCart(item) {
    setCart((current) => {
      const existing = current.find((entry) => entry.id === item._id);
      if (existing) {
        return current.map((entry) =>
          entry.id === item._id ? { ...entry, qty: entry.qty + 1 } : entry,
        );
      }
      return [
        ...current,
        {
          id: item._id,
          name: item.name,
          price: item.price,
          qty: 1,
          itemNotes: item.itemNotes || "",
          customSummary: item.customSummary || "",
          emoji: item.emoji || "",
        },
      ];
    });
    setAddedItemId(item._id);
    window.clearTimeout(addToCart.timer);
    addToCart.timer = window.setTimeout(() => setAddedItemId(""), 900);
    notify(`${item.name} aggiunta`);
  }

  function removeFromCart(id) {
    setCart((current) =>
      current
        .map((item) => (item.id === id ? { ...item, qty: item.qty - 1 } : item))
        .filter((item) => item.qty > 0),
    );
  }

  function updateCartItemNote(id, itemNotes) {
    setCart((current) =>
      current.map((item) => (item.id === id ? { ...item, itemNotes } : item)),
    );
  }

  function toggleFilter(filterId) {
    setActiveFilters((current) =>
      current.includes(filterId)
        ? current.filter((item) => item !== filterId)
        : [...current, filterId],
    );
    window.setTimeout(() => {
      document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  }

  function getCartItem(itemId) {
    return cart.find((item) => item.id === itemId);
  }

  function toggleCustomPizzaTopping(toppingId) {
    setCustomPizzaToppings((current) => {
      if (current.includes(toppingId)) {
        return current.filter((id) => id !== toppingId);
      }

      if (current.length >= CUSTOM_PIZZA_MAX_TOPPINGS) {
        notify(`Puoi scegliere fino a ${CUSTOM_PIZZA_MAX_TOPPINGS} ingredienti.`);
        return current;
      }

      return [...current, toppingId];
    });
  }

  function toggleCustomPizzaBuilder() {
    setCustomPizzaOpen((current) => {
      const next = !current;
      if (!current) {
        window.setTimeout(() => {
          customPizzaRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 80);
      }
      return next;
    });
  }

  function addCustomPizzaToCart() {
    if (!customPizzaBase) {
      notify("Scegli prima la base della pizza.");
      return;
    }

    const ingredientNames = customPizzaSelectedToppings.map(
      (topping) => topping.name,
    );
    const ingredientsText =
      ingredientNames.length > 0 ? ingredientNames.join(", ") : "nessuna aggiunta";
    const customNotes = [
      `Base: ${customPizzaBase.name}`,
      `Ingredienti: ${ingredientsText}`,
      customPizzaNotes.trim() ? `Note: ${customPizzaNotes.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    addToCart({
      _id: `custom-pizza-${customPizzaBase.id}-${customPizzaToppings
        .slice()
        .sort()
        .join("-")}-${customPizzaNotes.trim().toLowerCase()}`,
      name: "Tonda su ordinazione",
      emoji: "🍕",
      price: Math.round(customPizzaPrice * 100) / 100,
      itemNotes: customNotes,
      customSummary: [
        customPizzaBase.name,
        ...ingredientNames,
        customPizzaNotes.trim() ? customPizzaNotes.trim() : "",
      ]
        .filter(Boolean)
        .join(" · "),
    });
    setCustomPizzaOpen(false);
  }

  function reorderLastOrder() {
    const lastItems = customerProfile?.lastOrder?.items || [];

    if (lastItems.length === 0) {
      notify("Nessun ordine precedente da riordinare.");
      return;
    }

    setCart(
      lastItems.map((item) => ({
        id: item.menuItemId || item.name,
        name: item.name,
        price: item.price,
        qty: item.qty,
        itemNotes: item.notes || item.itemNotes || "",
      })),
    );
    notify("Ultimo ordine aggiunto al carrello.");
  }

  async function submitOrder(event) {
    event.preventDefault();

    if (!customer.trim()) return notify("Inserisci il tuo nome.");
    if (cart.length === 0) return notify("Aggiungi almeno un prodotto.");
    if (!selectedSlot) return notify("Scegli un orario di ritiro.");

    const slot = availability.slots.find((item) => item.pickupSlot === selectedSlot);
    if (!slot || slot.full || slot.past) {
      return notify("Questa fascia non e disponibile.");
    }

    try {
      const order = await createOrder({
        customer,
        phone,
        notes,
        pickupDate,
        pickupTime: slot.time,
        pickupSlot: slot.pickupSlot,
        items: cart.map((item) => {
          const orderItem = {
            name: item.name,
            price: item.price,
            qty: item.qty,
          };
          if (item.itemNotes?.trim()) orderItem.notes = item.itemNotes.trim();

          if (/^[a-f\d]{24}$/i.test(item.id)) {
            orderItem.menuItemId = item.id;
          }

          return orderItem;
        }),
      });

      setConfirmation(order);
      setCart([]);
      setCustomer("");
      setPhone("");
      setNotes("");
      setSelectedSlot("");
      setMobileCartOpen(false);
      setAvailability(await getAvailability(pickupDate));
    } catch (error) {
      notify(
        error.status === 409
          ? "Quel forno si e appena riempito: scegliamo un altro orario."
          : error.message,
      );
      setAvailability(await getAvailability(pickupDate).catch(() => null));
    }
  }

  if (confirmation) {
    return (
      <main className="customer-shell confirmation-shell">
        <section className="confirmation-card">
          <p className="eyebrow">Ordine preso al banco</p>
          <h1>Passa alle {confirmation.pickupTime}</h1>
          <p>
            Il forno ha ricevuto il tuo ordine. Tieni questa schermata o segui il
            ritiro per controllare quando passa a pronto.
          </p>

          <div className="confirmation-summary">
            <span>
              Nome <strong>{confirmation.customer}</strong>
            </span>
            <span>
              Totale <strong>{money(confirmation.total)}</strong>
            </span>
            <span>
              Stato{" "}
              <strong>
                {PUBLIC_STATUS_LABELS[confirmation.status] || confirmation.status}
              </strong>
            </span>
            <span>
              ID ordine <strong>{confirmation._id}</strong>
            </span>
          </div>

          <div className="confirmation-actions">
            <a className="tracking-link" href={orderTrackingHref(confirmation._id)}>
              Segui il ritiro
            </a>
            <button type="button" onClick={() => setConfirmation(null)}>
              Torna al menu
            </button>
          </div>
        </section>
        <Toast message={toast} />
      </main>
    );
  }

  return (
    <main className="customer-shell">
      <section className="brand-panel">
        <a className="admin-link" href="/admin">
          Admin
        </a>
        <span className={`counter-badge ${isCounterOpenNow() ? "open" : "closed"}`}>
          {isCounterOpenNow()
            ? "Banco aperto · ordina ora"
            : "Banco chiuso · riapre stasera alle 18:00"}
        </span>
        <p className="eyebrow">Mucho Gusto Pizzeria al Taglio</p>
        <h1>Tranci caldi, teglie fumanti e pizze pronte per l'asporto.</h1>
        <p className="lead">
          Scegli tranci, teglie, fritti e bibite. Prenoti l'orario, passi al
          banco e paghi al ritiro.
        </p>
        <div className="hero-actions">
          <button
            type="button"
            onClick={() =>
              document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Ordina ora →
          </button>
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("recover-order")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Recupera il tuo ordine ↓
          </button>
        </div>
        <div className="service-strip" aria-label="Servizio pizzeria">
          <span><strong>Asporto</strong> ritiro al banco</span>
          <span><strong>Pizza</strong> trancio o teglia</span>
          <span><strong>Pagamento</strong> in pizzeria</span>
        </div>
        <div className="customer-orders-panel" id="recover-order">
          <div>
            <p className="eyebrow">I miei ordini</p>
            <h2>Recupera il tuo ritiro</h2>
            <p>
              Inserisci il numero lasciato in ordine: ritrovi gli ultimi ritiri
              e li segui senza cercare il link.
            </p>
          </div>
          <label>
            Telefono
            <input
              type="tel"
              placeholder="Es. 333 123 4567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          {normalizedPhone.length > 0 && normalizedPhone.length < 6 && (
            <p className="orders-helper">
              Scrivi almeno 6 cifre per cercare i tuoi ordini.
            </p>
          )}
          {customerOrdersLoading && (
            <p className="orders-helper">Sto cercando i tuoi ordini...</p>
          )}
          {!customerOrdersLoading &&
            normalizedPhone.length >= 6 &&
            customerOrders.length === 0 && (
              <p className="orders-helper">
                Nessun ordine trovato con questo numero.
              </p>
            )}
          {customerOrders.length > 0 && (
            <div className="customer-orders-list">
              {customerOrders.map((order) => (
                <a href={orderTrackingHref(order._id)} key={order._id}>
                  <span>
                    <strong>{order.pickupDate} alle {order.pickupTime}</strong>
                    <small>
                      {PUBLIC_STATUS_LABELS[order.status] || order.status} -
                      {" "}{order.items.length} prodotti
                    </small>
                  </span>
                  <b>{money(order.total)}</b>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="order-layout" id="menu">
        <div className="menu-area">
          <div className="section-heading">
            <p className="eyebrow">Menu</p>
            <h2>Il banco di oggi</h2>
          </div>

          {loading ? (
            <p className="muted">Caricamento menu...</p>
          ) : (
            <div className="menu-sections">
              <div className="menu-tools">
                <label className="menu-search">
                  Cosa ti va dal banco?
                  <input
                    placeholder="Cerca trancio, teglia, fritto, bibita..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </label>
                <div className="quick-filters" aria-label="Filtri rapidi">
                  <button
                    type="button"
                    className={activeFilters.length === 0 ? "active" : ""}
                    onClick={() => {
                      setActiveFilters([]);
                      document
                        .getElementById("menu")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Tutti
                  </button>
                  {QUICK_FILTERS.map((filter) => (
                    <button
                      type="button"
                      className={activeFilters.includes(filter.id) ? "active" : ""}
                      key={filter.id}
                      onClick={() => toggleFilter(filter.id)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <nav className="menu-category-nav" aria-label="Categorie menu">
                {menuBySection.map((section) => (
                  <button
                    type="button"
                    className={activeMenu?.id === section.id ? "active" : ""}
                    key={section.id}
                    onClick={() => setActiveMenuSection(section.id)}
                  >
                    <span>{section.eyebrow}</span>
                    <strong>{section.title}</strong>
                  </button>
                ))}
              </nav>

              {menuBySection.length === 0 ? (
                <p className="menu-empty">
                  Niente al banco con questi filtri: prova a cercare un altro
                  trancio o sfizio.
                </p>
              ) : activeMenu && (
                <section
                  className="menu-section"
                  id={`menu-${activeMenu.id}`}
                  key={activeMenu.id}
                >
                  <div className="menu-section-head">
                    <div>
                      <p className="eyebrow">{activeMenu.eyebrow}</p>
                      <h3>{activeMenu.title}</h3>
                      <span>{activeMenu.description}</span>
                    </div>
                    <strong>
                      {activeMenu.items.length + (activeMenu.id === "pizze-tonde" ? 1 : 0)} prodotti
                    </strong>
                  </div>

                  <div className="menu-grid">
                    {activeMenu.id === "pizze-tonde" && (
                      <article
                        className={[
                          "menu-card",
                          "custom-pizza-card",
                          customPizzaOpen ? "expanded" : "",
                          addedItemId.startsWith("custom-pizza") ? "just-added" : "",
                        ].join(" ")}
                        ref={customPizzaRef}
                      >
                        <div className="menu-card-head">
                          <span className="menu-emoji">🍕</span>
                          <div>
                            <span className="menu-featured custom">Personalizzabile</span>
                            <span className="menu-name">Pizza su misura</span>
                            <span className="menu-desc">
                              Scegli base e ingredienti, la prepariamo noi al momento.
                            </span>
                            <span className="menu-unit">da {money(CUSTOM_PIZZA_BASES[0].price)}</span>
                          </div>
                        </div>

                        <button
                          className="menu-add-button custom-toggle"
                          type="button"
                          onClick={toggleCustomPizzaBuilder}
                          aria-expanded={customPizzaOpen}
                        >
                          {customPizzaOpen ? "▲ Chiudi" : "Configura"}
                        </button>

                        <div
                          className={`custom-pizza-accordion ${
                            customPizzaOpen ? "open" : ""
                          }`}
                        >
                          <hr />
                          <p className="custom-pizza-inner-title">
                            Componi la tua pizza
                          </p>

                          <div className="custom-pizza-group">
                            <span className="custom-pizza-label">Scegli la base</span>
                            <div className="custom-base-grid">
                              {CUSTOM_PIZZA_BASES.map((base) => (
                                <button
                                  type="button"
                                  className={base.id === customPizzaBaseId ? "active" : ""}
                                  key={base.id}
                                  onClick={() => setCustomPizzaBaseId(base.id)}
                                >
                                  <strong>
                                    {base.id === customPizzaBaseId ? "✓ " : ""}
                                    {base.name}
                                  </strong>
                                  <small>{base.description}</small>
                                  <b>{money(base.price)}</b>
                                </button>
                              ))}
                            </div>
                          </div>

                          {customPizzaBase && (
                            <>
                              <div className="custom-pizza-group">
                                <span className="custom-pizza-label">
                                  Aggiungi ingredienti ({customPizzaToppings.length}/
                                  {CUSTOM_PIZZA_MAX_TOPPINGS})
                                </span>
                                <div className="topping-grid">
                                  {CUSTOM_PIZZA_TOPPINGS.map((topping) => (
                                    <button
                                      type="button"
                                      className={
                                        customPizzaToppings.includes(topping.id)
                                          ? "active"
                                          : ""
                                      }
                                      key={topping.id}
                                      onClick={() => toggleCustomPizzaTopping(topping.id)}
                                    >
                                      <span>{topping.name}</span>
                                      <b>+ {money(topping.price)}</b>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <label className="custom-pizza-notes">
                                Note pizza
                                <textarea
                                  placeholder="Es. ben cotta, poca mozzarella..."
                                  maxLength={160}
                                  rows="2"
                                  value={customPizzaNotes}
                                  onChange={(event) =>
                                    setCustomPizzaNotes(event.target.value)
                                  }
                                />
                              </label>

                              <div className="custom-pizza-summary">
                                <span>
                                  <small>Base {customPizzaBase.name}</small>
                                  <strong>{money(customPizzaBase.price)}</strong>
                                </span>
                                {customPizzaSelectedToppings.map((topping) => (
                                  <span key={topping.id}>
                                    <small>+ {topping.name}</small>
                                    <strong>{money(topping.price)}</strong>
                                  </span>
                                ))}
                                <b>
                                  <span>Totale pizza</span>
                                  <strong>{money(customPizzaPrice)}</strong>
                                </b>
                              </div>
                            </>
                          )}

                          <button
                            className="custom-pizza-submit"
                            type="button"
                            onClick={addCustomPizzaToCart}
                            disabled={!customPizzaBase}
                            aria-disabled={!customPizzaBase}
                          >
                            Aggiungi al carrello · {money(customPizzaPrice)}
                          </button>
                        </div>
                      </article>
                    )}

                    {activeMenu.items.map((item) => {
                      const cartItem = getCartItem(item._id);

                      return (
                        <article
                          className={[
                            "menu-card",
                            addedItemId === item._id ? "just-added" : "",
                          ].join(" ")}
                          key={item._id}
                        >
                          {addedItemId === item._id && (
                            <span className="added-badge">Aggiunta</span>
                          )}
                          <div className="menu-card-head">
                            <span className="menu-emoji">{item.emoji || "Pizza"}</span>
                            <div>
                              <span className="menu-name">{item.name}</span>
                              <span className="menu-unit">
                                {money(item.price)} / {item.unit || "pezzo"}
                              </span>
                            </div>
                          </div>
                          <span className="menu-desc">{item.description}</span>
                          {item.featured && (
                            <span className="menu-featured">Piu richiesto</span>
                          )}
                          {cartItem ? (
                            <div className="menu-qty-controls">
                              <button
                                type="button"
                                onClick={() => removeFromCart(item._id)}
                              >
                                -
                              </button>
                              <strong>{cartItem.qty}</strong>
                              <button type="button" onClick={() => addToCart(item)}>
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              className="menu-add-button"
                              type="button"
                              onClick={() => addToCart(item)}
                            >
                              Aggiungi
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        <form
          className={`checkout-panel ${mobileCartOpen ? "mobile-open" : ""}`}
          onSubmit={submitOrder}
        >
          <button
            className="drawer-close"
            type="button"
            onClick={() => setMobileCartOpen(false)}
          >
            Chiudi
          </button>
          <div className="section-heading">
            <p className="eyebrow">Ritiro al banco</p>
            <h2>Il tuo asporto</h2>
          </div>

          <div className="cart-list">
            {cart.length === 0 ? (
              <p className="empty-cart">Nessun prodotto selezionato</p>
            ) : (
              cart.map((item) => (
                <div className="cart-row" key={item.id}>
                  <div>
                    <span>
                      {item.emoji && <b className="cart-row-emoji">{item.emoji}</b>}
                      {item.name}
                    </span>
                    {item.customSummary ? (
                      <small className="cart-custom-summary">
                        {item.customSummary}
                      </small>
                    ) : (
                      <textarea
                        placeholder={`Note per ${item.name}`}
                        value={item.itemNotes || ""}
                        onChange={(event) =>
                          updateCartItemNote(item.id, event.target.value)
                        }
                      />
                    )}
                  </div>
                  <strong>
                    {money(item.price * item.qty)}
                    <small>x{item.qty}</small>
                  </strong>
                  <div className="cart-row-actions">
                    <button type="button" onClick={() => removeFromCart(item.id)}>
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        addToCart({
                          _id: item.id,
                          name: item.name,
                          price: item.price,
                        })
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="total-row">
            <span>Totale</span>
            <strong>{money(total)}</strong>
          </div>

          <label>
            Nome
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} />
          </label>
          <label>
            Telefono
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <p className="privacy-note">
            Usiamo il numero solo per riconoscerti, gestire l'ordine e mostrarti
            i tuoi punti.
          </p>

          {!customerProfile && !customerLookupLoading && (
            <div className="loyalty-card loyalty-empty">
              <div>
                <p className="eyebrow">Tessera banco</p>
                <strong>Ordina con il tuo numero</strong>
                <span>
                  Accumuli punti e ritrovi piu velocemente i tuoi ordini
                  preferiti.
                </span>
              </div>
            </div>
          )}

          {customerLookupLoading && (
            <p className="loyalty-card subtle">Controllo tessera fedelta...</p>
          )}

          {customerProfile && (
            <div className="loyalty-card">
              <div>
                <p className="eyebrow">Bentornato al banco</p>
                <strong>{customerProfile.customer.name || "Cliente Mucho Gusto"}</strong>
                <span>
                  {loyaltyPoints} punti banco - {loyaltyRemaining} al prossimo
                  bonus
                </span>
                <strong className="loyalty-progress-label">
                  {loyaltyCyclePoints}/{LOYALTY_GOAL} verso il bonus
                </strong>
                <div className="loyalty-progress">
                  <span
                    style={{
                      width: `${(loyaltyCyclePoints / LOYALTY_GOAL) * 100}%`,
                    }}
                  />
                </div>
                <small>Ogni 10 ordini completati: 5 euro di sconto.</small>
              </div>
              {customerProfile.lastOrder && (
                <div className="reorder-panel">
                  <span>Riprendiamo lo stesso ordine dell'altra volta?</span>
                  <button type="button" onClick={reorderLastOrder}>
                    Riordina ora
                  </button>
                </div>
              )}
            </div>
          )}

          <label>
            Note
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <div className="date-strip">
            {dateOptions.map((date) => (
              <button
                type="button"
                className={date === pickupDate ? "active" : ""}
                key={date}
                onClick={() => setPickupDate(date)}
              >
                {formatDate(date)}
              </button>
            ))}
          </div>

          <div className="slot-grid">
            {!availability ? (
              <p className="slots-empty">Caricamento orari...</p>
            ) : visibleCustomerSlots.length === 0 ? (
              <p className="slots-empty">
                Nessun orario disponibile per questo giorno.
              </p>
            ) : (
              visibleCustomerSlots.map((slot) => (
                <button
                  type="button"
                  key={slot.pickupSlot}
                  className={[
                    selectedSlot === slot.pickupSlot ? "active" : "",
                    slot.almostFull ? "almost" : "",
                  ].join(" ")}
                  onClick={() => setSelectedSlot(slot.pickupSlot)}
                >
                  <span>{slot.time}</span>
                  <small>{getSlotHint(slot)}</small>
                </button>
              ))
            )}
          </div>

          <div className="payment-note">
            <strong>Pagamento al banco</strong>
            <span>Paghi quando passi a ritirare il sacchetto.</span>
          </div>

          <button
            className="submit-button"
            type="submit"
            disabled={!customer.trim() || !phone.trim() || cart.length === 0 || !selectedSlot}
          >
            Conferma ordine · {money(total)}
          </button>
        </form>
      </section>

      {mobileCartOpen && (
        <button
          className="drawer-scrim"
          type="button"
          aria-label="Chiudi carrello"
          onClick={() => setMobileCartOpen(false)}
        />
      )}

      {cartCount > 0 && (
        <div className="mobile-cart-bar">
          <div>
            <strong>
              {cartCount} {cartCount === 1 ? "prodotto" : "prodotti"} · {money(total)}
            </strong>
            <span>Ritiro al banco</span>
          </div>
          <button type="button" onClick={() => setMobileCartOpen(true)}>
            Vedi ordine
          </button>
        </div>
      )}

      <Toast message={toast} />
    </main>
  );
}

function TrackingView({ orderId }) {
  const [order, setOrder] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshOrder();
  }, [orderId]);

  function notify(message) {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(""), 2400);
  }

  async function refreshOrder() {
    setLoading(true);
    try {
      setOrder(await getOrder(orderId));
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  const activeStep = Math.max(
    ORDER_STATUS_STEPS.indexOf(order?.status || "preparing"),
    0,
  );

  return (
    <main className="tracking-shell">
      <section className="tracking-card">
        <a href="/">Torna al menu</a>
        <p className="eyebrow">Tracking ordine</p>
        {loading && !order ? (
          <h1>Caricamento...</h1>
        ) : order ? (
          <>
            <h1>{PUBLIC_STATUS_LABELS[order.status] || order.status}</h1>
            <p>
              Ritiro al banco:{" "}
              <strong>{order.pickupDate} alle {order.pickupTime}</strong>
            </p>
            <div className="tracking-steps">
              {ORDER_STATUS_STEPS.map((status, index) => (
                <span
                  className={index <= activeStep ? "active" : ""}
                  key={status}
                >
                  {PUBLIC_STATUS_LABELS[status]}
                </span>
              ))}
            </div>
            <div className="tracking-items">
              {order.items.map((item, index) => (
                <span key={`${item.name}-${index}`}>
                  <strong>{item.qty}x {item.name}</strong>
                  {item.notes && <small>{item.notes}</small>}
                </span>
              ))}
            </div>
            <strong className="tracking-total">{money(order.total)}</strong>
            <button type="button" onClick={refreshOrder}>
              Aggiorna stato
            </button>
          </>
        ) : (
          <h1>Ordine non trovato</h1>
        )}
      </section>
      <Toast message={toast} />
    </main>
  );
}

function AdminView() {
  const [token, setToken] = useState(localStorage.getItem("admin_token") || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [activeAdminSection, setActiveAdminSection] = useState("dashboard");
  const [pickupDate, setPickupDate] = useState(todayISO());
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [adminMenu, setAdminMenu] = useState([]);
  const [menuForm, setMenuForm] = useState(EMPTY_MENU_FORM);
  const [editingMenuId, setEditingMenuId] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({
    code: "",
    type: "percent",
    value: "",
    expiresAt: "",
    usageLimit: "",
    active: true,
  });
  const [editingCouponId, setEditingCouponId] = useState("");
  const [settingsForm, setSettingsForm] = useState({
    openingHours: "",
    deliveryCost: "",
    minimumOrder: "",
    serviceZones: "",
    customerMessage: "",
  });
  const [toast, setToast] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [menuSaving, setMenuSaving] = useState(false);
  const [couponSaving, setCouponSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    refresh();
    const timer = window.setInterval(refresh, ADMIN_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [token, pickupDate]);

  useEffect(() => {
    if (!token) return;
    loadAdminResources();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => loadCustomers(customerSearch), 350);
    return () => window.clearTimeout(timer);
  }, [customerSearch, token]);

  function notify(message) {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(""), 2400);
  }

  async function refresh() {
    if (refresh.inFlight) return;
    refresh.inFlight = true;
    setRefreshing(true);
    try {
      const [nextOrders, nextAvailability, nextStats] = await Promise.all([
        getOrders(token, pickupDate),
        getAvailability(pickupDate),
        getOrderStats(token),
      ]);
      setOrders(nextOrders);
      setAvailability(nextAvailability);
      setStats(nextStats);
      setLastUpdatedAt(
        new Intl.DateTimeFormat("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date()),
      );
    } catch (error) {
      if (error.status === 401) logout();
      else notify(error.message);
    } finally {
      refresh.inFlight = false;
      setRefreshing(false);
    }
  }

  async function loadAdminResources() {
    await Promise.all([loadAdminMenu(), loadCustomers(customerSearch), loadSettings()]);
  }

  async function loadAdminMenu() {
    try {
      setAdminMenu(await getAdminMenu(token));
    } catch (error) {
      if (error.status === 401) logout();
      else notify(error.message);
    }
  }

  async function loadCustomers(query = "") {
    try {
      setCustomers(await getAdminCustomers(token, query));
    } catch (error) {
      if (error.status === 401) logout();
      else notify(error.message);
    }
  }

  async function loadCoupons() {
    try {
      setCoupons(await getCoupons(token));
    } catch (error) {
      if (error.status === 401) logout();
      else notify(error.message);
    }
  }

  async function loadSettings() {
    try {
      const settings = await getStoreSettings(token);
      setSettingsForm({
        openingHours: settings.openingHours || "",
        deliveryCost: settings.deliveryCost ?? "",
        minimumOrder: settings.minimumOrder ?? "",
        serviceZones: (settings.serviceZones || []).join(", "),
        customerMessage: settings.customerMessage || "",
      });
    } catch (error) {
      if (error.status === 401) logout();
      else notify(error.message);
    }
  }

  async function login(event) {
    event.preventDefault();
    try {
      const data = await loginAdmin(username, password);
      localStorage.setItem("admin_token", data.token);
      setToken(data.token);
    } catch (error) {
      notify(error.message);
    }
  }

  function logout() {
    localStorage.removeItem("admin_token");
    setToken("");
    setAdminMenu([]);
    setCustomers([]);
    setCoupons([]);
  }

  async function changeStatus(id, status) {
    try {
      await updateOrderStatus(id, status, token);
      await refresh();
    } catch (error) {
      notify(error.message);
    }
  }

  function updateMenuForm(field, value) {
    setMenuForm((current) => ({ ...current, [field]: value }));
  }

  function editMenuItem(item) {
    setEditingMenuId(item._id);
    setMenuForm(menuItemToForm(item));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetMenuForm() {
    setEditingMenuId("");
    setMenuForm(EMPTY_MENU_FORM);
  }

  async function saveMenuItem(event) {
    event.preventDefault();

    if (!menuForm.name.trim()) return notify("Inserisci il nome del prodotto.");
    if (!menuForm.price || Number(menuForm.price) < 0) {
      return notify("Inserisci un prezzo valido.");
    }

    setMenuSaving(true);
    try {
      const payload = menuFormToPayload(menuForm);
      if (editingMenuId) {
        await updateMenuItem(editingMenuId, payload, token);
        notify("Prodotto aggiornato.");
      } else {
        await createMenuItem(payload, token);
        notify("Prodotto aggiunto al menu.");
      }
      resetMenuForm();
      await loadAdminMenu();
    } catch (error) {
      notify(error.message);
    } finally {
      setMenuSaving(false);
    }
  }

  function updateCouponForm(field, value) {
    setCouponForm((current) => ({ ...current, [field]: value }));
  }

  function editCoupon(coupon) {
    setEditingCouponId(coupon._id);
    setCouponForm({
      code: coupon.code || "",
      type: coupon.type || "percent",
      value: coupon.value ?? "",
      expiresAt: coupon.expiresAt || "",
      usageLimit: coupon.usageLimit ?? "",
      active: coupon.active !== false,
    });
    setActiveAdminSection("coupons");
  }

  function resetCouponForm() {
    setEditingCouponId("");
    setCouponForm({
      code: "",
      type: "percent",
      value: "",
      expiresAt: "",
      usageLimit: "",
      active: true,
    });
  }

  async function saveCoupon(event) {
    event.preventDefault();
    if (!couponForm.code.trim()) return notify("Inserisci un codice coupon.");
    if (!couponForm.value || Number(couponForm.value) <= 0) {
      return notify("Inserisci un valore coupon valido.");
    }

    setCouponSaving(true);
    try {
      const payload = {
        ...couponForm,
        code: couponForm.code.trim().toUpperCase(),
        value: Number(couponForm.value),
        usageLimit: Number(couponForm.usageLimit) || 0,
      };
      if (editingCouponId) {
        await updateCoupon(editingCouponId, payload, token);
        notify("Coupon aggiornato.");
      } else {
        await createCoupon(payload, token);
        notify("Coupon creato.");
      }
      resetCouponForm();
      await loadCoupons();
    } catch (error) {
      notify(error.message);
    } finally {
      setCouponSaving(false);
    }
  }

  async function changeCouponStatus(id) {
    try {
      await toggleCoupon(id, token);
      await loadCoupons();
    } catch (error) {
      notify(error.message);
    }
  }

  async function removeCoupon(id) {
    const confirmed = window.confirm("Eliminare questo coupon?");
    if (!confirmed) return;

    try {
      await deleteCoupon(id, token);
      await loadCoupons();
      notify("Coupon eliminato.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSettingsSaving(true);
    try {
      await updateStoreSettings(
        {
          openingHours: settingsForm.openingHours,
          deliveryCost: Number(settingsForm.deliveryCost) || 0,
          minimumOrder: Number(settingsForm.minimumOrder) || 0,
          serviceZones: parseCommaList(settingsForm.serviceZones),
          customerMessage: settingsForm.customerMessage,
        },
        token,
      );
      notify("Impostazioni aggiornate.");
      await loadSettings();
    } catch (error) {
      notify(error.message);
    } finally {
      setSettingsSaving(false);
    }
  }

  async function changeMenuAvailability(id) {
    try {
      await toggleMenuItem(id, token);
      await loadAdminMenu();
    } catch (error) {
      notify(error.message);
    }
  }

  async function removeMenuItem(id) {
    const confirmed = window.confirm("Eliminare questo prodotto dal menu?");
    if (!confirmed) return;

    try {
      await deleteMenuItem(id, token);
      await loadAdminMenu();
      notify("Prodotto eliminato.");
    } catch (error) {
      notify(error.message);
    }
  }

  const groupedOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const query = orderSearch.trim().toLowerCase();
        const matchesFilter =
          orderFilter === "all" ||
          (orderFilter === "new" ? isFreshOrder(order) : order.status === orderFilter);
        const haystack = `${order.customer || ""} ${order.phone || ""} ${
          order.notes || ""
        } ${(order.items || []).map((item) => item.name).join(" ")}`.toLowerCase();
        return matchesFilter && (!query || haystack.includes(query));
      })
      .reduce((groups, order) => {
      const key = order.pickupSlot || "Senza fascia";
      groups[key] = groups[key] || [];
      groups[key].push(order);
      return groups;
    }, {});
  }, [orderFilter, orderSearch, orders]);

  const visibleOrders = useMemo(
    () => Object.values(groupedOrders).flat(),
    [groupedOrders],
  );

  const groupedMenu = useMemo(() => {
    return adminMenu.reduce((groups, item) => {
      const key = getAdminMenuCategory(item);
      groups[key] = groups[key] || [];
      groups[key].push(item);
      return groups;
    }, {});
  }, [adminMenu]);

  const dashboardStats = useMemo(() => {
    const today = stats?.today || {};
    const fallbackRevenue = orders
      .filter((order) => order.status !== "cancelled")
      .reduce((sum, order) => sum + (Number(order.total) || 0), 0);

    return {
      total: today.total ?? orders.filter((order) => order.status !== "cancelled").length,
      revenue: today.revenue ?? fallbackRevenue,
      pending:
        (today.preparing ?? orders.filter((order) => order.status === "preparing").length) +
        (today.ready ?? orders.filter((order) => order.status === "ready").length),
      done: today.done ?? orders.filter((order) => order.status === "done").length,
      cancelled:
        today.cancelled ?? orders.filter((order) => order.status === "cancelled").length,
    };
  }, [orders, stats]);

  const topProducts = useMemo(() => {
    if (stats?.topProducts?.length) return stats.topProducts;
    const productMap = new Map();
    for (const order of orders) {
      if (order.status === "cancelled") continue;
      for (const item of order.items || []) {
        const current = productMap.get(item.name) || { name: item.name, qty: 0, revenue: 0 };
        current.qty += item.qty || 0;
        current.revenue += (item.price || 0) * (item.qty || 0);
        productMap.set(item.name, current);
      }
    }
    return Array.from(productMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [orders, stats]);

  const recentOrders = stats?.recentOrders?.length ? stats.recentOrders : orders.slice(0, 8);
  const unavailableItems = adminMenu.filter((item) => !item.available);
  const topProductMax = Math.max(...topProducts.map((item) => item.qty || 0), 1);

  if (!token) {
    return (
      <main className="admin-login">
        <form className="login-panel" onSubmit={login}>
          <a href="/">Menu cliente</a>
          <h1>Banco admin</h1>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Accedi</button>
        </form>
        <Toast message={toast} />
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <p className="eyebrow">Mucho Gusto</p>
          <strong>Banco admin</strong>
        </div>
        <nav>
          {ADMIN_NAV.map((item) => (
            <button
              className={activeAdminSection === item.id ? "active" : ""}
              key={item.id}
              type="button"
              onClick={() => setActiveAdminSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <a href="/">Menu cliente</a>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Operativita giornaliera</p>
            <h1>{ADMIN_NAV.find((item) => item.id === activeAdminSection)?.label}</h1>
          </div>
          <div className="admin-actions">
            <span className="refresh-note">
              {lastUpdatedAt ? `Aggiornato ${lastUpdatedAt}` : "Non aggiornato"}
            </span>
            <button type="button" onClick={refresh} disabled={refreshing}>
              {refreshing ? "Aggiorno..." : "Aggiorna"}
            </button>
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
            />
            <button type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        {(activeAdminSection === "dashboard" || activeAdminSection === "orders") && (
          <section className="admin-stats-grid">
            <article>
              <span>Ordini oggi</span>
              <strong>{dashboardStats.total}</strong>
            </article>
            <article>
              <span>Incasso</span>
              <strong>{money(dashboardStats.revenue)}</strong>
            </article>
            <article>
              <span>In attesa</span>
              <strong>{dashboardStats.pending}</strong>
            </article>
            <article>
              <span>Ritirati</span>
              <strong>{dashboardStats.done}</strong>
            </article>
          </section>
        )}

        {activeAdminSection === "dashboard" && (
          <section className="admin-dashboard-grid">
            <div className="admin-panel">
              <div className="section-heading">
                <p className="eyebrow">Oggi al banco</p>
                <h2>Ordini in arrivo</h2>
              </div>
              <div className="admin-table">
                {recentOrders.length === 0 ? (
                  <p className="muted">Nessun ordine registrato oggi.</p>
                ) : (
                  recentOrders.map((order) => (
                    <article
                      className={`compact-order ${isUrgentOrder(order) ? "urgent" : ""}`}
                      key={order._id}
                    >
                      <div>
                        <strong>{order.customer}</strong>
                        <span>{order.pickupTime} · {money(order.total)}</span>
                      </div>
                      <span className={`status ${order.status}`}>
                        {isFreshOrder(order) ? "Nuovo" : STATUSES[order.status]}
                      </span>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className="admin-panel">
              <div className="section-heading">
                <p className="eyebrow">Vendite</p>
                <h2>Piu ordinati</h2>
              </div>
              <div className="top-products">
                {topProducts.length === 0 ? (
                  <p className="muted">Ancora nessun prodotto venduto oggi.</p>
                ) : (
                  topProducts.map((item) => (
                    <span className="top-product-row" key={item.name}>
                      <span>
                        <strong>{item.name}</strong>
                        <b>{item.qty} pz · {money(item.revenue)}</b>
                      </span>
                      <i style={{ width: `${((item.qty || 0) / topProductMax) * 100}%` }} />
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="admin-panel">
              <div className="section-heading">
                <p className="eyebrow">Capienza</p>
                <h2>Fasce orarie</h2>
              </div>
              <div className="capacity-strip compact">
                {(availability?.slots || []).map((slot) => (
                  <div
                    className={[
                      "capacity-pill",
                      slot.full ? "full" : "",
                      slot.almostFull ? "almost" : "",
                    ].join(" ")}
                    key={slot.pickupSlot}
                  >
                    <strong>{slot.time}</strong>
                    <span>{slot.count}/{availability.maxOrdersPerSlot}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeAdminSection === "orders" && (
          <>
            <section className="admin-toolbar">
              <div className="quick-filters">
                {ORDER_FILTERS.map((filter) => (
                  <button
                    className={orderFilter === filter.id ? "active" : ""}
                    key={filter.id}
                    type="button"
                    onClick={() => setOrderFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <input
                placeholder="Cerca cliente, telefono, prodotto o nota"
                value={orderSearch}
                onChange={(event) => setOrderSearch(event.target.value)}
              />
            </section>

            <section className="slot-columns">
              {visibleOrders.length === 0 ? (
                <p className="muted">Nessun ordine con questi filtri.</p>
              ) : (
                Object.entries(groupedOrders).map(([slot, slotOrders]) => (
                  <div className="slot-column" key={slot}>
                    <h2>{slotOrders[0]?.pickupTime || slot}</h2>
                    {slotOrders.map((order) => (
                      <article
                        className={`order-card ${isUrgentOrder(order) ? "urgent" : ""}`}
                        key={order._id}
                      >
                        <div className="order-card-head">
                          <strong>{order.customer}</strong>
                          <span className={`status ${order.status}`}>
                            {isFreshOrder(order) ? "Nuovo" : STATUSES[order.status]}
                          </span>
                        </div>
                        <div className="order-meta">
                          <span>{order.phone || "Telefono non inserito"}</span>
                          <span>{order.pickupDate} · {order.pickupTime}</span>
                          <strong>{money(order.total)}</strong>
                        </div>
                        <p>
                          {(order.items || [])
                            .map((item) => `${item.qty}x ${item.name}`)
                            .join(" | ")}
                        </p>
                        {order.notes && <p className="order-note">{order.notes}</p>}
                        {order.items?.some((item) => item.notes) && (
                          <div className="order-item-notes">
                            {order.items
                              .filter((item) => item.notes)
                              .map((item, index) => (
                                <span key={`${order._id}-note-${index}`}>
                                  <strong>{item.name}</strong>: {item.notes}
                                </span>
                              ))}
                          </div>
                        )}
                        <div className="status-buttons">
                          {Object.keys(STATUSES).map((status) => (
                            <button
                              className={order.status === status ? "active" : ""}
                              type="button"
                              key={status}
                              onClick={() => changeStatus(order._id, status)}
                            >
                              {STATUSES[status]}
                            </button>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {activeAdminSection === "menu" && (
          <section className="admin-menu-manager">
            <form className="menu-editor-panel" onSubmit={saveMenuItem}>
              <div className="section-heading">
                <p className="eyebrow">Gestione menu</p>
                <h2>{editingMenuId ? "Modifica prodotto" : "Aggiungi prodotto"}</h2>
              </div>

          <div className="menu-editor-grid">
            <label>
              Nome prodotto
              <input
                value={menuForm.name}
                onChange={(event) => updateMenuForm("name", event.target.value)}
                placeholder="Es. Margherita"
              />
            </label>
            <label>
              Prezzo
              <input
                min="0"
                step="0.1"
                type="number"
                value={menuForm.price}
                onChange={(event) => updateMenuForm("price", event.target.value)}
                placeholder="6.00"
              />
            </label>
            <label>
              Categoria
              <select
                value={menuForm.category}
                onChange={(event) => updateMenuForm("category", event.target.value)}
              >
                {MENU_CATEGORY_OPTIONS.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Unita
              <select
                value={menuForm.unit}
                onChange={(event) => updateMenuForm("unit", event.target.value)}
              >
                {MENU_UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Emoji
              <input
                value={menuForm.emoji}
                onChange={(event) => updateMenuForm("emoji", event.target.value)}
                placeholder="🍕"
              />
            </label>
            <label>
              Ordine
              <input
                min="0"
                step="1"
                type="number"
                value={menuForm.sortOrder}
                onChange={(event) => updateMenuForm("sortOrder", event.target.value)}
                placeholder="10"
              />
            </label>
          </div>

          <label>
            Immagine prodotto
            <input
              value={menuForm.imageUrl}
              onChange={(event) => updateMenuForm("imageUrl", event.target.value)}
              placeholder="https://..."
            />
          </label>

          <label>
            Descrizione ingredienti
            <textarea
              value={menuForm.description}
              onChange={(event) =>
                updateMenuForm("description", event.target.value)
              }
              placeholder="Pomodoro, mozzarella, basilico"
            />
          </label>

          <div className="menu-editor-grid">
            <label>
              Tag
              <input
                value={menuForm.tags}
                onChange={(event) => updateMenuForm("tags", event.target.value)}
                placeholder="vegetariana, classica"
              />
            </label>
            <label>
              Allergeni
              <input
                value={menuForm.allergens}
                onChange={(event) =>
                  updateMenuForm("allergens", event.target.value)
                }
                placeholder="glutine, latte"
              />
            </label>
          </div>

          <label className="menu-featured-check">
            <input
              checked={menuForm.featured}
              type="checkbox"
              onChange={(event) =>
                updateMenuForm("featured", event.target.checked)
              }
            />
            Segna come piu richiesta / novita
          </label>

          <div className="menu-editor-actions">
            <button type="submit" disabled={menuSaving}>
              {menuSaving
                ? "Salvataggio..."
                : editingMenuId
                  ? "Salva modifiche"
                  : "Aggiungi al menu"}
            </button>
            {editingMenuId && (
              <button type="button" onClick={resetMenuForm}>
                Annulla modifica
              </button>
            )}
          </div>
        </form>

        <div className="menu-admin-list">
          <div className="section-heading">
            <p className="eyebrow">Prodotti pubblicati</p>
            <h2>Menu della pizzeria</h2>
          </div>
          {MENU_CATEGORY_OPTIONS.map((category) => {
            const items = groupedMenu[category.value] || [];
            if (items.length === 0) return null;

            return (
              <section className="menu-admin-category" key={category.value}>
                <h3>{category.label}</h3>
                <div className="menu-admin-items">
                  {items.map((item) => (
                    <article
                      className={`menu-admin-item ${item.available ? "" : "off"}`}
                      key={item._id}
                    >
                      <div>
                        <strong>
                          {item.emoji || "🍕"} {item.name}
                        </strong>
                        {item.imageUrl && (
                          <img className="menu-admin-thumb" src={item.imageUrl} alt="" />
                        )}
                        <span>{item.description || "Senza descrizione"}</span>
                        <small>
                          {money(item.price)} · {item.unit || "pezzo"} · ordine{" "}
                          {item.sortOrder || 0}
                        </small>
                      </div>
                      <div className="menu-admin-actions">
                        <button type="button" onClick={() => editMenuItem(item)}>
                          Modifica
                        </button>
                        <button
                          type="button"
                          onClick={() => changeMenuAvailability(item._id)}
                        >
                          {item.available ? "Nascondi" : "Mostra"}
                        </button>
                        <button
                          className="danger"
                          type="button"
                          onClick={() => removeMenuItem(item._id)}
                        >
                          Elimina
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>
        )}

        {activeAdminSection === "availability" && (
          <section className="admin-dashboard-grid">
            <div className="admin-panel wide">
              <div className="section-heading">
                <p className="eyebrow">Disponibilita prodotti</p>
                <h2>Esauriti o nascosti</h2>
              </div>
              <div className="availability-list">
                {adminMenu.length === 0 ? (
                  <p className="muted">Menu non ancora caricato.</p>
                ) : (
                  adminMenu.map((item) => (
                    <article className={item.available ? "" : "off"} key={item._id}>
                      <div>
                        <strong>{item.emoji || "🍕"} {item.name}</strong>
                        <span>{item.available ? "Visibile ai clienti" : "Nascosto / esaurito"}</span>
                      </div>
                      <button type="button" onClick={() => changeMenuAvailability(item._id)}>
                        {item.available ? "Segna esaurito" : "Rendi ordinabile"}
                      </button>
                    </article>
                  ))
                )}
              </div>
            </div>
            <div className="admin-panel">
              <div className="section-heading">
                <p className="eyebrow">Riepilogo</p>
                <h2>Stato menu</h2>
              </div>
              <div className="top-products">
                <span><strong>Prodotti attivi</strong><b>{adminMenu.length - unavailableItems.length}</b></span>
                <span><strong>Non ordinabili</strong><b>{unavailableItems.length}</b></span>
                <span><strong>Categorie</strong><b>{MENU_CATEGORY_OPTIONS.length}</b></span>
              </div>
            </div>
          </section>
        )}

        {activeAdminSection === "customers" && (
          <section className="admin-panel">
            <div className="section-heading">
              <p className="eyebrow">Clienti</p>
              <h2>Rubrica ordini</h2>
            </div>
            <input
              className="admin-search"
              placeholder="Cerca nome o telefono"
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
            />
            <div className="customer-admin-list">
              {customers.length === 0 ? (
                <p className="muted">Nessun cliente trovato.</p>
              ) : (
                customers.map((customer) => (
                  <article key={customer._id}>
                    <div>
                      <strong>{customer.name || "Cliente senza nome"}</strong>
                      <span>{customer.phone}</span>
                    </div>
                    <span>{customer.totalOrders || 0} ordini</span>
                    <span>{customer.completedOrders || 0} ritirati</span>
                    <strong>{money(customer.totalSpent)}</strong>
                    <small>{customer.lastOrderAt ? formatDateTime(customer.lastOrderAt) : "Nessun ordine"}</small>
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {activeAdminSection === "coupons" && (
          <section className="admin-menu-manager">
            <form className="menu-editor-panel" onSubmit={saveCoupon}>
              <div className="section-heading">
                <p className="eyebrow">Coupon e offerte</p>
                <h2>{editingCouponId ? "Modifica coupon" : "Nuovo coupon"}</h2>
              </div>
              <div className="menu-editor-grid">
                <label>
                  Codice
                  <input
                    value={couponForm.code}
                    onChange={(event) => updateCouponForm("code", event.target.value)}
                    placeholder="PIZZA10"
                  />
                </label>
                <label>
                  Tipo
                  <select
                    value={couponForm.type}
                    onChange={(event) => updateCouponForm("type", event.target.value)}
                  >
                    <option value="percent">Percentuale</option>
                    <option value="fixed">Importo fisso</option>
                  </select>
                </label>
                <label>
                  Valore
                  <input
                    min="0"
                    step="0.1"
                    type="number"
                    value={couponForm.value}
                    onChange={(event) => updateCouponForm("value", event.target.value)}
                  />
                </label>
                <label>
                  Scadenza
                  <input
                    type="date"
                    value={couponForm.expiresAt}
                    onChange={(event) => updateCouponForm("expiresAt", event.target.value)}
                  />
                </label>
                <label>
                  Limite utilizzi
                  <input
                    min="0"
                    step="1"
                    type="number"
                    value={couponForm.usageLimit}
                    onChange={(event) => updateCouponForm("usageLimit", event.target.value)}
                    placeholder="0 = illimitato"
                  />
                </label>
              </div>
              <label className="menu-featured-check">
                <input
                  checked={couponForm.active}
                  type="checkbox"
                  onChange={(event) => updateCouponForm("active", event.target.checked)}
                />
                Coupon attivo
              </label>
              <div className="menu-editor-actions">
                <button type="submit" disabled={couponSaving}>
                  {couponSaving ? "Salvataggio..." : editingCouponId ? "Salva coupon" : "Crea coupon"}
                </button>
                {editingCouponId && (
                  <button type="button" onClick={resetCouponForm}>
                    Annulla
                  </button>
                )}
              </div>
            </form>

            <div className="menu-admin-list">
              <div className="section-heading">
                <p className="eyebrow">Offerte attive</p>
                <h2>Codici sconto</h2>
              </div>
              {coupons.length === 0 ? (
                <p className="muted">Nessun coupon creato.</p>
              ) : (
                <div className="menu-admin-items">
                  {coupons.map((coupon) => (
                    <article className={`menu-admin-item ${coupon.active ? "" : "off"}`} key={coupon._id}>
                      <div>
                        <strong>{coupon.code}</strong>
                        <span>
                          {coupon.type === "percent" ? `${coupon.value}%` : money(coupon.value)}
                          {coupon.expiresAt ? ` · fino al ${coupon.expiresAt}` : " · senza scadenza"}
                        </span>
                        <small>{coupon.usedCount || 0}/{coupon.usageLimit || "∞"} utilizzi</small>
                      </div>
                      <div className="menu-admin-actions">
                        <button type="button" onClick={() => editCoupon(coupon)}>Modifica</button>
                        <button type="button" onClick={() => changeCouponStatus(coupon._id)}>
                          {coupon.active ? "Disattiva" : "Attiva"}
                        </button>
                        <button className="danger" type="button" onClick={() => removeCoupon(coupon._id)}>
                          Elimina
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeAdminSection === "settings" && (
          <section className="admin-panel settings-panel">
            <div className="section-heading">
              <p className="eyebrow">Locale</p>
              <h2>Impostazioni operative</h2>
            </div>
            <form className="settings-form" onSubmit={saveSettings}>
              <label>
                Orari apertura
                <input
                  value={settingsForm.openingHours}
                  onChange={(event) =>
                    setSettingsForm((current) => ({ ...current, openingHours: event.target.value }))
                  }
                />
              </label>
              <label>
                Costo consegna
                <input
                  min="0"
                  step="0.1"
                  type="number"
                  value={settingsForm.deliveryCost}
                  onChange={(event) =>
                    setSettingsForm((current) => ({ ...current, deliveryCost: event.target.value }))
                  }
                />
              </label>
              <label>
                Ordine minimo
                <input
                  min="0"
                  step="0.1"
                  type="number"
                  value={settingsForm.minimumOrder}
                  onChange={(event) =>
                    setSettingsForm((current) => ({ ...current, minimumOrder: event.target.value }))
                  }
                />
              </label>
              <label>
                Zone servite
                <input
                  value={settingsForm.serviceZones}
                  onChange={(event) =>
                    setSettingsForm((current) => ({ ...current, serviceZones: event.target.value }))
                  }
                  placeholder="Centro, San Paolo, Eur"
                />
              </label>
              <label className="settings-full">
                Messaggio temporaneo
                <textarea
                  value={settingsForm.customerMessage}
                  onChange={(event) =>
                    setSettingsForm((current) => ({ ...current, customerMessage: event.target.value }))
                  }
                  placeholder="Siamo chiusi per ferie"
                />
              </label>
              <button type="submit" disabled={settingsSaving}>
                {settingsSaving ? "Salvataggio..." : "Salva impostazioni"}
              </button>
            </form>
          </section>
        )}
      </section>

      <Toast message={toast} />
    </main>
  );
}

function App() {
  const path = window.location.pathname;
  const orderIdFromQuery = new URLSearchParams(window.location.search).get("ordine");
  if (orderIdFromQuery) {
    return <TrackingView orderId={orderIdFromQuery} />;
  }
  if (path.startsWith("/ordine/")) {
    return <TrackingView orderId={decodeURIComponent(path.split("/")[2] || "")} />;
  }
  return path.startsWith("/admin") ? <AdminView /> : <CustomerView />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
