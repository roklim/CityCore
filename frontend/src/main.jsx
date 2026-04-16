import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createOrder,
  getAvailability,
  getCustomerOrders,
  getMenu,
  getOrder,
  getOrders,
  lookupCustomer,
  loginAdmin,
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
  ready: "Pronto per il ritiro",
  done: "Completato",
  cancelled: "Annullato",
};
const ADMIN_REFRESH_INTERVAL_MS = 120000;
const LOYALTY_GOAL = 10;
const MENU_SECTIONS = [
  {
    id: "pizze-tonde",
    title: "Le Pizze Tonde",
    eyebrow: "Forno classico",
    description: "Impasto fragrante, bordo alto e ingredienti della casa.",
  },
  {
    id: "pizza-teglia",
    title: "Pizza in Teglia",
    eyebrow: "Al taglio",
    description: "Tranci generosi, perfetti da condividere o portare via.",
  },
  {
    id: "fritti",
    title: "Fritti e Sfizi",
    eyebrow: "Sfizi caldi",
    description: "Croccanti, dorati, da aggiungere all'ordine.",
  },
  {
    id: "bevande",
    title: "Bevande",
    eyebrow: "Fresco",
    description: "Bibite e acqua per completare il ritiro.",
  },
  {
    id: "altro",
    title: "Altre proposte",
    eyebrow: "Extra",
    description: "Dolci e specialita disponibili oggi.",
  },
];
const QUICK_FILTERS = [
  { id: "vegetariana", label: "Vegetariana" },
  { id: "piccante", label: "Piccante" },
  { id: "senza-lattosio", label: "Senza lattosio" },
  { id: "novita", label: "Novita" },
  { id: "piu-ordinati", label: "Piu ordinati" },
];
const ORDER_STATUS_STEPS = ["preparing", "ready", "done"];

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
    fritti: "fritti",
    drink: "bevande",
    bevande: "bevande",
    dessert: "altro",
    dolci: "altro",
    extra: "altro",
  };

  if (categoryMap[category]) return categoryMap[category];

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

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart],
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart],
  );
  const normalizedPhone = useMemo(() => phone.replace(/\D/g, ""), [phone]);

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

  return (
    <main className="customer-shell">
      <section className="brand-panel">
        <a className="admin-link" href="/admin">
          Admin
        </a>
        <p className="eyebrow">Mucho Gusto Pizzeria</p>
        <h1>Ordina l'asporto senza code in cucina.</h1>
        <p className="lead">
          Scegli la pizza, prenota la fascia di ritiro e lasciaci gestire il
          flusso degli ordini.
        </p>
        <div className="customer-orders-panel">
          <div>
            <p className="eyebrow">I miei ordini</p>
            <h2>Ritrova subito il tuo ritiro</h2>
            <p>
              Inserisci il numero usato nell'ordine: ti mostriamo gli ultimi
              ritiri e il link per seguirli.
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
            <h2>Le proposte di oggi</h2>
          </div>

          {loading ? (
            <p className="muted">Caricamento menu...</p>
          ) : (
            <div className="menu-sections">
              <div className="menu-tools">
                <label className="menu-search">
                  Cerca nel menu
                  <input
                    placeholder="Cerca pizza, fritto, bevanda..."
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
                  Nessun prodotto trovato: prova a cambiare ricerca o filtri.
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
            <p className="eyebrow">Ritiro</p>
            <h2>Il tuo ordine</h2>
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
                <p className="eyebrow">Fedelta</p>
                <strong>Ordina con il tuo numero</strong>
                <span>
                  Accumuli punti e puoi riordinare le tue pizze preferite piu
                  velocemente.
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
                <p className="eyebrow">Bentornato</p>
                <strong>{customerProfile.customer.name || "Cliente Mucho Gusto"}</strong>
                <span>
                  {loyaltyPoints} punti fedelta - {loyaltyRemaining} al prossimo
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
                  <span>Vuoi riordinare come l'altra volta?</span>
                  <button type="button" onClick={reorderLastOrder}>
                    Riordina ultimo
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
            <strong>Pagamento al ritiro</strong>
            <span>Paghi in pizzeria quando ritiri l'ordine.</span>
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

      {confirmation && (
        <div className="modal-backdrop">
          <div className="modal">
            <p className="eyebrow">Ordine ricevuto</p>
            <h2>Ritiro alle {confirmation.pickupTime}</h2>
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
            <a className="tracking-link" href={orderTrackingHref(confirmation._id)}>
              Segui stato ordine
            </a>
            <button type="button" onClick={() => setConfirmation(null)}>
              Nuovo ordine
            </button>
          </div>
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
              Ritiro: <strong>{order.pickupDate} alle {order.pickupTime}</strong>
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
                  {item.qty}x {item.name}
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
  const [toast, setToast] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!token) return;
    refresh();
    const timer = window.setInterval(refresh, ADMIN_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [token, pickupDate]);

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
  }

  async function changeStatus(id, status) {
    try {
      await updateOrderStatus(id, status, token);
      await refresh();
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
          <p className="eyebrow">Mucho Gusto</p>
          <h1>Ordini per fascia</h1>
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
