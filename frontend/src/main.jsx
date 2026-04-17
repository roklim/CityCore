import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createMenuItem,
  createOrder,
  deleteMenuItem,
  getAvailability,
  getAdminMenu,
  getCustomerOrders,
  getMenu,
  getOrder,
  getOrders,
  lookupCustomer,
  loginAdmin,
  toggleMenuItem,
  updateMenuItem,
  updateOrderStatus,
} from "./lib/api";
import "./styles.css";

const STATUSES = {
  preparing: "Preparazione",
  ready: "Pronto",
  done: "Completato",
  cancelled: "Annullato",
};
const PUBLIC_STATUS_LABELS = {
  preparing: "In preparazione",
  ready: "Pronto al banco",
  done: "Completato",
  cancelled: "Annullato",
};
const ADMIN_REFRESH_INTERVAL_MS = 120000;
const LOYALTY_GOAL = 10;
const MENU_CATEGORY_OPTIONS = [
  { value: "pizze-tonde", label: "Pizze Normali" },
  { value: "pizza-teglia", label: "Pizza al Trancio" },
  { value: "pizza-speciali", label: "Pizze Speciali" },
  { value: "fritti", label: "Fritti" },
  { value: "bevande", label: "Bevande" },
  { value: "dolci", label: "Dolci" },
  { value: "extra", label: "Extra" },
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
  sortOrder: "",
  unit: "trancio",
  tags: "",
  allergens: "",
  featured: false,
};
const MENU_SECTIONS = [
  {
    id: "pizze-tonde",
    title: "Pizze Normali",
    eyebrow: "Classiche",
    description: "Margherita, Napoli, cotto, crudo e le pizze di tutti i giorni.",
  },
  {
    id: "pizza-teglia",
    title: "Pizza al Trancio",
    eyebrow: "Banco caldo",
    description: "Tranci e teglie fragranti, pronti da portare via.",
  },
  {
    id: "pizza-speciali",
    title: "Pizze Speciali",
    eyebrow: "Le Mucho pizze",
    description: "Ricette piu ricche con burrata, mortadella e ingredienti speciali.",
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
  const [customPizzaBaseId, setCustomPizzaBaseId] = useState(
    CUSTOM_PIZZA_BASES[2].id,
  );
  const [customPizzaToppings, setCustomPizzaToppings] = useState([]);
  const [customPizzaNotes, setCustomPizzaNotes] = useState("");

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
      CUSTOM_PIZZA_BASES.find((base) => base.id === customPizzaBaseId) ||
      CUSTOM_PIZZA_BASES[0],
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
      customPizzaBase.price +
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
    })).filter((section) => section.items.length > 0);
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

  function addCustomPizzaToCart() {
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
      name: "Pizza su misura",
      price: Math.round(customPizzaPrice * 100) / 100,
      itemNotes: customNotes,
    });
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
        <p className="eyebrow">Mucho Gusto Pizzeria al Taglio</p>
        <h1>Tranci caldi, teglie fumanti e pizze pronte per l'asporto.</h1>
        <p className="lead">
          Scegli dal banco, prenota il ritiro e passa appena il forno ha
          preparato il tuo ordine.
        </p>
        <div className="customer-orders-panel">
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

      <section className="order-layout">
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

              <section className="custom-pizza-builder">
                <div className="custom-pizza-head">
                  <div>
                    <p className="eyebrow">Tonda su richiesta</p>
                    <h3>Componi una pizza su misura</h3>
                    <span>
                      Scegli base e ingredienti: noi la prepariamo al momento e
                      il forno riceve tutto nelle note.
                    </span>
                  </div>
                  <strong>{money(customPizzaPrice)}</strong>
                </div>

                <div className="custom-pizza-group">
                  <span className="custom-pizza-label">Base</span>
                  <div className="custom-base-grid">
                    {CUSTOM_PIZZA_BASES.map((base) => (
                      <button
                        type="button"
                        className={base.id === customPizzaBase.id ? "active" : ""}
                        key={base.id}
                        onClick={() => setCustomPizzaBaseId(base.id)}
                      >
                        <strong>{base.name}</strong>
                        <small>{base.description}</small>
                        <b>{money(base.price)}</b>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="custom-pizza-group">
                  <span className="custom-pizza-label">
                    Ingredienti ({customPizzaToppings.length}/
                    {CUSTOM_PIZZA_MAX_TOPPINGS})
                  </span>
                  <div className="topping-grid">
                    {CUSTOM_PIZZA_TOPPINGS.map((topping) => (
                      <button
                        type="button"
                        className={
                          customPizzaToppings.includes(topping.id) ? "active" : ""
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
                  Note per questa pizza
                  <input
                    placeholder="Es. ben cotta, poca mozzarella..."
                    maxLength={120}
                    value={customPizzaNotes}
                    onChange={(event) => setCustomPizzaNotes(event.target.value)}
                  />
                </label>

                <button
                  className="custom-pizza-submit"
                  type="button"
                  onClick={addCustomPizzaToCart}
                >
                  Aggiungi tonda su misura - {money(customPizzaPrice)}
                </button>
              </section>

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
                    <strong>{activeMenu.items.length}</strong>
                  </div>

                  <div className="menu-grid">
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
                          <span className="menu-emoji">{item.emoji || "Pizza"}</span>
                          <span className="menu-name">{item.name}</span>
                          <span className="menu-desc">{item.description}</span>
                          <span className="menu-price">{money(item.price)}</span>
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
                    <span>{item.name}</span>
                    <textarea
                      placeholder={`Note per ${item.name}`}
                      value={item.itemNotes || ""}
                      onChange={(event) =>
                        updateCartItemNote(item.id, event.target.value)
                      }
                    />
                  </div>
                  <strong>x{item.qty}</strong>
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

          <button className="submit-button" type="submit">
            Conferma ordine
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
              {cartCount} {cartCount === 1 ? "prodotto" : "prodotti"}
            </strong>
            <span>{money(total)}</span>
          </div>
          <button type="button" onClick={() => setMobileCartOpen(true)}>
            Vai al carrello
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
  const [pickupDate, setPickupDate] = useState(todayISO());
  const [orders, setOrders] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [adminMenu, setAdminMenu] = useState([]);
  const [menuForm, setMenuForm] = useState(EMPTY_MENU_FORM);
  const [editingMenuId, setEditingMenuId] = useState("");
  const [toast, setToast] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [menuSaving, setMenuSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    refresh();
    const timer = window.setInterval(refresh, ADMIN_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [token, pickupDate]);

  useEffect(() => {
    if (!token) return;
    loadAdminMenu();
  }, [token]);

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
      const [nextOrders, nextAvailability] = await Promise.all([
        getOrders(token, pickupDate),
        getAvailability(pickupDate),
      ]);
      setOrders(nextOrders);
      setAvailability(nextAvailability);
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

  async function loadAdminMenu() {
    try {
      setAdminMenu(await getAdminMenu(token));
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
    return orders.reduce((groups, order) => {
      const key = order.pickupSlot || "Senza fascia";
      groups[key] = groups[key] || [];
      groups[key].push(order);
      return groups;
    }, {});
  }, [orders]);

  const groupedMenu = useMemo(() => {
    return adminMenu.reduce((groups, item) => {
      const key = getAdminMenuCategory(item);
      groups[key] = groups[key] || [];
      groups[key].push(item);
      return groups;
    }, {});
  }, [adminMenu]);

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
      <header className="admin-header">
        <div>
          <p className="eyebrow">Banco Mucho Gusto</p>
          <h1>Ritiri per fascia</h1>
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

      <section className="capacity-strip">
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
            <span>
              {slot.count}/{availability.maxOrdersPerSlot}
            </span>
          </div>
        ))}
      </section>

      <section className="slot-columns">
        {Object.entries(groupedOrders).length === 0 ? (
          <p className="muted">Nessun ordine per questa giornata.</p>
        ) : (
          Object.entries(groupedOrders).map(([slot, slotOrders]) => (
            <div className="slot-column" key={slot}>
              <h2>{slotOrders[0]?.pickupTime || slot}</h2>
              {slotOrders.map((order) => (
                <article className="order-card" key={order._id}>
                  <div className="order-card-head">
                    <strong>{order.customer}</strong>
                    <span className={`status ${order.status}`}>
                      {STATUSES[order.status] || order.status}
                    </span>
                  </div>
                  <p>
                    {order.items
                      .map((item) => `${item.qty}x ${item.name}`)
                      .join(" | ")}
                  </p>
                  {order.items.some((item) => item.notes) && (
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
