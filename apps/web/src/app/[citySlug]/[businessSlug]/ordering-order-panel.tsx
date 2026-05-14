"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PublicOrderingMenuPreview } from "../../../lib/public-runtime";
import type {
  PublicOrderingAvailabilityResponse,
  PublicOrderingCreateOrderResponse,
  PublicOrderingCustomerLookupResponse,
} from "../../../lib/v2-api";

type OrderingOrderPanelProps = {
  citySlug: string;
  businessSlug: string;
  businessName: string;
  settings: PublicOrderingMenuPreview["settings"];
  categories: PublicOrderingMenuPreview["categories"];
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  emoji: string | null;
  qty: number;
};

type MenuCartCandidate = {
  id: string;
  name: string;
  price: number;
  emoji: string | null;
};

function getApiBaseUrl() {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!value) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is required.");
  }

  return value.replace(/\/+$/, "");
}

function toMoney(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function getInitialDateValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function OrderingOrderPanel({
  citySlug,
  businessSlug,
  businessName,
  settings,
  categories,
}: OrderingOrderPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupDate, setPickupDate] = useState(getInitialDateValue);
  const [selectedPickupSlot, setSelectedPickupSlot] = useState("");
  const [availability, setAvailability] = useState<PublicOrderingAvailabilityResponse | null>(null);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");
  const [loyaltyMessage, setLoyaltyMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const menuItems = useMemo(
    () =>
      categories.flatMap((category) =>
        category.items.map((item) => ({
          ...item,
          categoryName: category.name,
        })),
      ),
    [categories],
  );

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const selectedSlot =
    availability?.slots.find((slot) => slot.pickupSlot === selectedPickupSlot) ?? null;

  useEffect(() => {
    let active = true;

    async function loadAvailability() {
      if (!pickupDate) {
        setAvailability(null);
        setAvailabilityError("");
        setSelectedPickupSlot("");
        return;
      }

      setAvailabilityLoading(true);
      setAvailabilityError("");

      try {
        const response = await fetch(
          `${getApiBaseUrl()}/api/v2/ordering/public/${citySlug}/${businessSlug}/availability?date=${encodeURIComponent(pickupDate)}`,
          {
            cache: "no-store",
          },
        );

        const body = (await response.json()) as
          | PublicOrderingAvailabilityResponse
          | { error?: string };

        if (!active) {
          return;
        }

        if (!response.ok || !("status" in body) || body.status !== "ok") {
          setAvailability(null);
          setAvailabilityError(
            body && "error" in body && body.error ? body.error : "Disponibilita non disponibile.",
          );
          setSelectedPickupSlot("");
          return;
        }

        setAvailability(body);
        setSelectedPickupSlot((current) => {
          const fallbackSlot =
            body.slots.find((slot) => slot.pickupSlot === current && slot.available) ??
            body.slots.find((slot) => slot.available) ??
            null;

          return fallbackSlot?.pickupSlot ?? "";
        });
      } catch {
        if (!active) {
          return;
        }

        setAvailability(null);
        setAvailabilityError("Impossibile caricare gli slot disponibili.");
        setSelectedPickupSlot("");
      } finally {
        if (active) {
          setAvailabilityLoading(false);
        }
      }
    }

    void loadAvailability();

    return () => {
      active = false;
    };
  }, [businessSlug, citySlug, pickupDate]);

  function addToCart(item: MenuCartCandidate) {
    setCart((current) => {
      const existing = current.find((entry) => entry.id === item.id);

      if (!existing) {
        return [
          ...current,
          {
            id: item.id,
            name: item.name,
            price: item.price,
            emoji: item.emoji,
            qty: 1,
          },
        ];
      }

      return current.map((entry) =>
        entry.id === item.id ? { ...entry, qty: entry.qty + 1 } : entry,
      );
    });
  }

  function removeFromCart(itemId: string) {
    setCart((current) =>
      current
        .map((entry) => (entry.id === itemId ? { ...entry, qty: entry.qty - 1 } : entry))
        .filter((entry) => entry.qty > 0),
    );
  }

  function clearState() {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setCouponCode("");
    setLookupMessage("");
    setLoyaltyMessage("");
    setPickupDate(getInitialDateValue());
    setSelectedPickupSlot("");
  }

  async function lookupCustomer() {
    const phone = customerPhone.trim();

    if (!phone) {
      setLookupMessage("Inserisci un numero di telefono per controllare storico e punti.");
      setLoyaltyMessage("");
      return;
    }

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/v2/ordering/public/${citySlug}/${businessSlug}/customers/lookup?phone=${encodeURIComponent(phone)}`,
        {
          cache: "no-store",
        },
      );

      const body = (await response.json()) as
        | PublicOrderingCustomerLookupResponse
        | { error?: string };

      if (!response.ok || !("status" in body) || body.status !== "ok") {
        setLookupMessage(
          body && "error" in body && body.error ? body.error : "Lookup non disponibile.",
        );
        setLoyaltyMessage("");
        return;
      }

      if (!body.found || !body.customer) {
        setLookupMessage(
          "Nessuno storico trovato su questo numero. Il primo ordine parte comunque subito.",
        );
        setLoyaltyMessage("");
        return;
      }

      if (!customerName.trim() && body.customer.name) {
        setCustomerName(body.customer.name);
      }

      setLookupMessage(`Profilo trovato: ${body.customer.totalOrders} ordini totali nel business.`);
      setLoyaltyMessage(
        `${body.customer.points} punti, ${body.customer.completedOrders} ordini completati.` +
          (body.lastOrder ? ` Ultimo ordine: ${body.lastOrder.status}.` : ""),
      );
    } catch {
      setLookupMessage("Impossibile recuperare lo storico cliente in questo momento.");
      setLoyaltyMessage("");
    }
  }

  async function submitOrder() {
    setError("");
    setSuccess("");

    if (cart.length === 0) {
      setError("Aggiungi almeno un prodotto.");
      return;
    }

    if (!customerName.trim()) {
      setError("Inserisci il nome del cliente.");
      return;
    }

    if (settings.minimumOrder > 0 && total < settings.minimumOrder) {
      setError(`Ordine minimo: ${toMoney(settings.minimumOrder)}.`);
      return;
    }

    if (!pickupDate || !selectedSlot) {
      setError("Seleziona una data e uno slot di ritiro disponibili.");
      return;
    }

    if (!selectedSlot.available) {
      setError("Lo slot scelto non e piu disponibile. Aggiorna la disponibilita.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(
          `${getApiBaseUrl()}/api/v2/ordering/public/${citySlug}/${businessSlug}/orders`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              customerName,
              customerPhone,
              couponCode: couponCode || undefined,
              pickupDate,
              pickupTime: selectedSlot.time,
              pickupSlot: selectedSlot.pickupSlot,
              notes: notes || undefined,
              items: cart.map((item) => ({
                menuItemId: item.id,
                qty: item.qty,
              })),
            }),
          },
        );

        const body = (await response.json()) as
          | PublicOrderingCreateOrderResponse
          | { error?: string };

        if (!response.ok || !("status" in body) || body.status !== "ok") {
          setError(body && "error" in body && body.error ? body.error : "Ordine non creato.");
          return;
        }

        setSuccess("Ordine creato. Apertura tracking...");
        clearState();
        router.push(body.trackingPath);
        router.refresh();
      } catch {
        setError("Impossibile creare l'ordine in questo momento.");
      }
    });
  }

  return (
    <section className="order-panel">
      <div className="section-header">
        <p className="section-label">Ordine V2</p>
        <h2>Checkout ordering gia operativo in CityCore</h2>
        <p>
          Catalogo, creazione ordine e tracking passano gia dalla piattaforma attiva. Il flusso e
          leggero, ma completo quanto basta per partire bene.
        </p>
      </div>

      <div className="order-layout">
        <div className="order-menu-list">
          {menuItems.length > 0 ? (
            menuItems.map((item) => (
              <article className="order-menu-card" key={item.id}>
                <div className="card-copy">
                  <h3>{item.emoji ? `${item.emoji} ${item.name}` : item.name}</h3>
                  <p>{item.description ?? `Categoria ${item.categoryName}`}</p>
                </div>

                <div className="order-menu-footer">
                  <strong>{item.price != null ? toMoney(item.price) : "Prezzo da definire"}</strong>
                  <button
                    className="cta-button secondary"
                    disabled={item.price == null}
                    onClick={() => {
                      if (item.price == null) {
                        return;
                      }

                      addToCart({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        emoji: item.emoji,
                      });
                    }}
                    type="button"
                  >
                    Aggiungi
                  </button>
                </div>
              </article>
            ))
          ) : (
            <article className="spotlight-card">
              <p className="section-label">Menu vuoto</p>
              <h3>Serve ancora popolare il catalogo ordering V2.</h3>
              <p>
                La surface e pronta, ma senza piatti attivi non puo ancora mostrare un catalogo
                completo.
              </p>
            </article>
          )}
        </div>

        <div className="order-checkout-card">
          <div className="card-copy">
            <h3>Ritiro presso {businessName}</h3>
            <p>
              Checkout essenziale: nome, telefono e slot validato lato server. Il tracking nasce
              subito in V2.
            </p>
          </div>

          {settings.customerMessage ? (
            <p className="surface-card-inline">{settings.customerMessage}</p>
          ) : null}

          {settings.openingHours ? (
            <p className="muted-copy">Orari visibili: {settings.openingHours}</p>
          ) : null}
          <p className="muted-copy">
            Slot da {settings.slotMinutes} minuti, lead time minimo {settings.minPreparationMinutes}{" "}
            minuti.
          </p>

          <div className="order-cart-list">
            {cart.length > 0 ? (
              cart.map((item) => (
                <div className="order-cart-row" key={item.id}>
                  <div>
                    <strong>{item.emoji ? `${item.emoji} ${item.name}` : item.name}</strong>
                    <span>
                      {toMoney(item.price)} x {item.qty}
                    </span>
                  </div>
                  <div className="order-qty-actions">
                    <button type="button" onClick={() => removeFromCart(item.id)}>
                      -
                    </button>
                    <span>{item.qty}</span>
                    <button type="button" onClick={() => addToCart(item)}>
                      +
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted-copy">Il carrello e vuoto.</p>
            )}
          </div>

          <label className="field">
            <span>Nome</span>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Es. Marco"
            />
          </label>

          <label className="field">
            <span>Telefono</span>
            <input
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="Es. 333 123 4567"
            />
          </label>

          <button className="ghost-button" onClick={lookupCustomer} type="button">
            Controlla storico cliente
          </button>

          {lookupMessage ? <p className="muted-copy">{lookupMessage}</p> : null}
          {loyaltyMessage ? <p className="surface-success">{loyaltyMessage}</p> : null}

          <label className="field">
            <span>Data ritiro</span>
            <input
              type="date"
              value={pickupDate}
              onChange={(event) => setPickupDate(event.target.value)}
            />
          </label>

          {availabilityLoading ? (
            <p className="muted-copy">Caricamento slot disponibili...</p>
          ) : null}
          {availabilityError ? <p className="form-error">{availabilityError}</p> : null}
          {availability?.closed ? (
            <p className="surface-card-inline">
              Il business risulta chiuso nella data selezionata. Scegli un altro giorno.
            </p>
          ) : null}
          {availability && !availability.closed ? (
            <div className="slot-grid" role="list" aria-label="Slot di ritiro disponibili">
              {availability.slots.map((slot) => (
                <button
                  key={slot.pickupSlot}
                  aria-pressed={selectedPickupSlot === slot.pickupSlot}
                  className={`slot-button${selectedPickupSlot === slot.pickupSlot ? " is-active" : ""}`}
                  disabled={!slot.available}
                  onClick={() => setSelectedPickupSlot(slot.pickupSlot)}
                  type="button"
                >
                  <strong>{slot.time}</strong>
                  <span>
                    {slot.past
                      ? "Passato"
                      : slot.full
                        ? "Pieno"
                        : slot.almostFull
                          ? `${slot.remaining} posto rimasto`
                          : `${slot.remaining} posti`}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {selectedSlot ? (
            <p className="surface-success">
              Ritiro selezionato: {pickupDate} alle {selectedSlot.time}.
            </p>
          ) : null}

          <label className="field">
            <span>Note</span>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Allergie o richieste"
            />
          </label>

          <label className="field">
            <span>Coupon</span>
            <input
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              placeholder="Es. BENVENUTO10"
            />
          </label>

          <div className="order-total-row">
            <span>Totale</span>
            <strong>{toMoney(total)}</strong>
          </div>

          {settings.minimumOrder > 0 ? (
            <p className="muted-copy">Ordine minimo richiesto: {toMoney(settings.minimumOrder)}.</p>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}
          {success ? <p className="surface-success">{success}</p> : null}

          <button
            className="cta-button"
            disabled={isPending || cart.length === 0}
            onClick={submitOrder}
            type="button"
          >
            {isPending ? "Creazione ordine..." : "Conferma ordine V2"}
          </button>
        </div>
      </div>
    </section>
  );
}
