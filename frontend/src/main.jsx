import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createOrder,
  getAvailability,
  getMenu,
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
const ADMIN_REFRESH_INTERVAL_MS = 120000;
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

function todayISO() {
  return toLocalISODate(new Date());
}

function addDaysISO(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toLocalISODate(date);
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
  const text = `${item.category || ""} ${item.name || ""} ${
    item.description || ""
  }`.toLowerCase();

  if (/(drink|bevande|bibite|acqua|coca|cola|fanta|sprite|birra|vino)/.test(text)) {
    return "bevande";
  }
  if (/(teglia|trancio|taglio|pala)/.test(text)) return "pizza-teglia";
  if (/(fritti|fritto|suppli|supplì|arancino|crocche|patatin|olive ascolane)/.test(text)) {
    return "fritti";
  }
  if (/(pizza|margherita|diavola|formaggi|prosciutto|napoli|capricciosa)/.test(text)) {
    return "pizze-tonde";
  }

  return "altro";
}

function scrollToMenuSection(sectionId) {
  document
    .getElementById(`menu-${sectionId}`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart],
  );

  const dateOptions = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDaysISO(index)),
    [],
  );

  const visibleCustomerSlots = useMemo(
    () => (availability?.slots || []).filter((slot) => !slot.full && !slot.past),
    [availability],
  );

  const menuBySection = useMemo(() => {
    return MENU_SECTIONS.map((section) => ({
      ...section,
      items: menu.filter((item) => getMenuSectionId(item) === section.id),
    })).filter((section) => section.items.length > 0);
  }, [menu]);

  useEffect(() => {
    getMenu()
      .then(setMenu)
      .catch(() => notify("Menu non disponibile. Riprova tra poco."))
      .finally(() => setLoading(false));
  }, []);

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
    const normalizedPhone = phone.replace(/\D/g, "");

    if (normalizedPhone.length < 6) {
      setCustomerProfile(null);
      return;
    }

    let cancelled = false;
    setCustomerLookupLoading(true);

    const timer = window.setTimeout(() => {
      lookupCustomer(normalizedPhone)
        .then((data) => {
          if (cancelled) return;
          setCustomerProfile(data.found ? data : null);
          if (data.found && data.customer?.name && !customer.trim()) {
            setCustomer(data.customer.name);
          }
        })
        .catch(() => {
          if (!cancelled) setCustomerProfile(null);
        })
        .finally(() => {
          if (!cancelled) setCustomerLookupLoading(false);
        });
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [phone]);

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
    notify(`${item.name} aggiunta`);
  }

  function removeFromCart(id) {
    setCart((current) =>
      current
        .map((item) => (item.id === id ? { ...item, qty: item.qty - 1 } : item))
        .filter((item) => item.qty > 0),
    );
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
      setAvailability(await getAvailability(pickupDate));
    } catch (error) {
      notify(error.message);
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
              <nav className="menu-category-nav" aria-label="Categorie menu">
                {menuBySection.map((section) => (
                  <button
                    type="button"
                    key={section.id}
                    onClick={() => scrollToMenuSection(section.id)}
                  >
                    <span>{section.eyebrow}</span>
                    <strong>{section.title}</strong>
                  </button>
                ))}
              </nav>

              {menuBySection.map((section) => (
                <section
                  className="menu-section"
                  id={`menu-${section.id}`}
                  key={section.id}
                >
                  <div className="menu-section-head">
                    <div>
                      <p className="eyebrow">{section.eyebrow}</p>
                      <h3>{section.title}</h3>
                      <span>{section.description}</span>
                    </div>
                    <strong>{section.items.length}</strong>
                  </div>

                  <div className="menu-grid">
                    {section.items.map((item) => (
                      <button
                        className="menu-card"
                        key={item._id}
                        onClick={() => addToCart(item)}
                      >
                        <span className="menu-emoji">{item.emoji || "Pizza"}</span>
                        <span className="menu-name">{item.name}</span>
                        <span className="menu-desc">{item.description}</span>
                        <span className="menu-price">{money(item.price)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <form className="checkout-panel" onSubmit={submitOrder}>
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
                  <span>{item.name}</span>
                  <strong>x{item.qty}</strong>
                  <button type="button" onClick={() => removeFromCart(item.id)}>
                    -
                  </button>
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
                  {customerProfile.customer.points} punti fedelta -{" "}
                  {Math.max(10 - customerProfile.customer.points, 0)} al prossimo bonus
                </span>
              </div>
              {customerProfile.lastOrder && (
                <button type="button" onClick={reorderLastOrder}>
                  Riordina ultimo
                </button>
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
                  <small>Disponibile</small>
                </button>
              ))
            )}
          </div>

          <button className="submit-button" type="submit">
            Conferma ordine
          </button>
        </form>
      </section>

      {confirmation && (
        <div className="modal-backdrop">
          <div className="modal">
            <p className="eyebrow">Ordine ricevuto</p>
            <h2>{confirmation.pickupTime}</h2>
            <p>
              ID ordine: <strong>{confirmation._id}</strong>
            </p>
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
  return path.startsWith("/admin") ? <AdminView /> : <CustomerView />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
