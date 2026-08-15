"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  createPublicPickupOrder,
  getPublicPickupAvailability,
  PlatformApiError,
  type PublicPickupMenuItem,
} from "../../lib/platform-api";
import {
  validatePublicPickupValues,
  type PublicPickupFieldErrors,
  type PublicPickupFormValues,
} from "../../lib/public-form-validation";

const initialValues: PublicPickupFormValues = {
  name: "",
  email: "",
  phone: "",
  notes: "",
  privacyAccepted: false,
  company: "",
};

function dateInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function maxPickupDate(date: string) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 30);
  return value.toISOString().slice(0, 10);
}

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function messageFor(error: unknown) {
  if (error instanceof PlatformApiError) {
    if (error.status === 429) return "Hai inviato troppi ordini in poco tempo. Riprova più tardi.";
    if (error.status === 409)
      return "L'orario selezionato non è più disponibile. Scegline un altro.";
    if (error.status === 404) return "L'ordine con ritiro non è disponibile per questa attività.";
    if (error.status === 400) return "Controlla i dati dell'ordine e riprova.";
  }
  return "Non è stato possibile inviare l'ordine. Controlla la connessione e riprova.";
}

export function PublicPickupOrderForm({
  citySlug,
  businessSlug,
  currency,
  timezone,
  minimumOrderCents,
  items,
}: {
  citySlug: string;
  businessSlug: string;
  currency: string;
  timezone: string;
  minimumOrderCents: number;
  items: PublicPickupMenuItem[];
}) {
  const initialDate = useMemo(() => dateInTimezone(timezone), [timezone]);
  const [values, setValues] = useState(initialValues);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [pickupDate, setPickupDate] = useState(initialDate);
  const [pickupTime, setPickupTime] = useState("");
  const [slots, setSlots] = useState<Array<{ id: string; time: string; available: boolean }>>([]);
  const [availabilityState, setAvailabilityState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [availabilityRetry, setAvailabilityRetry] = useState(0);
  const [errors, setErrors] = useState<PublicPickupFieldErrors>({});
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const firstError = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement | null>(
    null,
  );
  const submittingRef = useRef(false);
  const shouldFocusErrorsRef = useRef(false);

  useEffect(() => {
    if (!shouldFocusErrorsRef.current) return;
    shouldFocusErrorsRef.current = false;
    firstError.current?.focus();
  }, [errors]);

  const selectedItems = items
    .map((item) => ({ ...item, quantity: cart[item.id] ?? 0 }))
    .filter((item) => item.quantity > 0);
  const totalCents = selectedItems.reduce(
    (total, item) => total + item.priceCents * item.quantity,
    0,
  );
  const minimumReached = totalCents >= minimumOrderCents;

  useEffect(() => {
    const controller = new AbortController();
    setAvailabilityState("loading");
    setPickupTime("");
    void getPublicPickupAvailability(citySlug, businessSlug, pickupDate)
      .then((response) => {
        if (!controller.signal.aborted) {
          setSlots(response.items);
          setAvailabilityState("ready");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSlots([]);
          setAvailabilityState("error");
        }
      });
    return () => controller.abort();
  }, [availabilityRetry, businessSlug, citySlug, pickupDate]);

  function update<K extends keyof PublicPickupFormValues>(
    key: K,
    value: PublicPickupFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (!submittingRef.current) {
      setState("idle");
      setFeedback("");
    }
  }

  function changeQuantity(item: PublicPickupMenuItem, amount: number) {
    setCart((current) => {
      const quantity = Math.max(0, Math.min(20, (current[item.id] ?? 0) + amount));
      const next = { ...current };
      if (quantity) next[item.id] = quantity;
      else delete next[item.id];
      return next;
    });
    setState("idle");
    setFeedback("");
    setErrors((current) => {
      if (!current.items) return current;
      const next = { ...current };
      delete next.items;
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const nextErrors = validatePublicPickupValues(values, selectedItems.length, pickupTime);
    if (!minimumReached)
      nextErrors.items = `L'ordine minimo è ${formatPrice(minimumOrderCents, currency)}.`;
    firstError.current = null;
    shouldFocusErrorsRef.current = Object.keys(nextErrors).length > 0;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setState("error");
      setFeedback("Controlla i campi evidenziati.");
      return;
    }
    submittingRef.current = true;
    setState("submitting");
    setFeedback("");
    try {
      const response = await createPublicPickupOrder(citySlug, businessSlug, {
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        notes: values.notes || undefined,
        pickupDate,
        pickupTime,
        privacyAccepted: true,
        company: values.company,
        items: selectedItems.map((item) => ({ serviceId: item.id, quantity: item.quantity })),
      });
      setValues(initialValues);
      setCart({});
      setPickupTime("");
      setErrors({});
      setState("success");
      setFeedback(
        `Ordine ricevuto. Codice ${response.item.reference}. L'attività confermerà il ritiro alle ${pickupTime}.`,
      );
    } catch (error) {
      setState("error");
      setFeedback(messageFor(error));
      if (error instanceof PlatformApiError && error.status === 409) setPickupTime("");
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <section
      className="public-pickup-order public-secondary-service"
      id="order"
      aria-labelledby="pickup-order-title"
    >
      <div className="section-header public-form-header">
        <p className="section-label">Servizio opzionale</p>
        <h2 id="pickup-order-title">Ordina per il ritiro</h2>
        <p>Scegli dal menu e indica quando vuoi passare a ritirare.</p>
      </div>

      <form
        aria-busy={state === "submitting"}
        className="public-pickup-order-form"
        onSubmit={submit}
        noValidate
      >
        <fieldset
          className="public-order-menu"
          aria-describedby={errors.items ? "order-items-error" : undefined}
        >
          <legend>1. Scegli cosa ordinare</legend>
          {items.map((item, index) => {
            const quantity = cart[item.id] ?? 0;
            return (
              <article className="public-order-menu-item" key={item.id}>
                <div>
                  <h3>{item.name}</h3>
                  {item.shortDescription ? <p>{item.shortDescription}</p> : null}
                  <strong>{formatPrice(item.priceCents, currency)}</strong>
                </div>
                <div
                  className="public-quantity-control"
                  aria-label={`Quantità ${item.name}`}
                  role="group"
                >
                  <button
                    type="button"
                    onClick={() => changeQuantity(item, -1)}
                    disabled={quantity === 0 || state === "submitting"}
                    aria-label={`Rimuovi un'unità di ${item.name}`}
                  >
                    −
                  </button>
                  <output aria-live="polite">{quantity}</output>
                  <button
                    ref={
                      errors.items && index === 0
                        ? (element) => {
                            if (element && !firstError.current) firstError.current = element;
                          }
                        : undefined
                    }
                    type="button"
                    onClick={() => changeQuantity(item, 1)}
                    disabled={quantity === 20 || state === "submitting"}
                    aria-label={`Aggiungi un'unità di ${item.name}`}
                  >
                    +
                  </button>
                </div>
              </article>
            );
          })}
          {errors.items ? (
            <p className="public-form-error" id="order-items-error">
              {errors.items}
            </p>
          ) : null}
          <p className="public-order-total" id="order-total">
            Totale <strong>{formatPrice(totalCents, currency)}</strong>
            {minimumOrderCents ? ` · Minimo ${formatPrice(minimumOrderCents, currency)}` : ""}
          </p>
        </fieldset>

        <fieldset
          className="public-order-pickup"
          aria-describedby={errors.pickup ? "pickup-error" : undefined}
        >
          <legend>2. Scegli data e orario</legend>
          <label className="public-form-field">
            Data
            <input
              ref={
                errors.pickup
                  ? (element) => {
                      if (element && !firstError.current) firstError.current = element;
                    }
                  : undefined
              }
              type="date"
              name="pickupDate"
              required
              value={pickupDate}
              min={initialDate}
              max={maxPickupDate(initialDate)}
              onChange={(event) => {
                setPickupDate(event.target.value);
                setErrors((current) => {
                  if (!current.pickup) return current;
                  const next = { ...current };
                  delete next.pickup;
                  return next;
                });
                setState("idle");
                setFeedback("");
              }}
              disabled={state === "submitting"}
            />
          </label>
          <div
            className="public-slot-list"
            aria-busy={availabilityState === "loading"}
            aria-live="polite"
          >
            {availabilityState === "loading" ? <p>Caricamento orari disponibili…</p> : null}
            {availabilityState === "error" ? (
              <div className="public-availability-error">
                <p className="public-form-error">Non è stato possibile caricare gli orari.</p>
                <button
                  className="public-retry-button"
                  onClick={() => setAvailabilityRetry((current) => current + 1)}
                  type="button"
                >
                  Riprova a caricare
                </button>
              </div>
            ) : null}
            {availabilityState === "ready" && !slots.length ? (
              <p>Nessun orario di ritiro disponibile per questa data.</p>
            ) : null}
            {slots.map((slot) => (
              <button
                className={pickupTime === slot.time ? "is-active" : undefined}
                key={slot.id}
                type="button"
                disabled={!slot.available || state === "submitting"}
                aria-label={`${slot.time}${slot.available ? "" : ", non disponibile"}`}
                aria-pressed={pickupTime === slot.time}
                onClick={() => {
                  setPickupTime(slot.time);
                  setErrors((current) => {
                    if (!current.pickup) return current;
                    const next = { ...current };
                    delete next.pickup;
                    return next;
                  });
                  setState("idle");
                  setFeedback("");
                }}
              >
                {slot.time}
                {!slot.available ? " · non disponibile" : ""}
              </button>
            ))}
          </div>
          {errors.pickup ? (
            <p className="public-form-error" id="pickup-error">
              {errors.pickup}
            </p>
          ) : null}
        </fieldset>

        <fieldset className="public-order-contact">
          <legend>3. Inserisci i tuoi dati</legend>
          <div className="public-form-grid">
            {(["name", "email", "phone"] as const).map((field) => (
              <label className="public-form-field" key={field}>
                {field === "name" ? "Nome" : field === "email" ? "Email" : "Telefono (facoltativo)"}
                <input
                  ref={
                    errors[field]
                      ? (element) => {
                          if (element && !firstError.current) firstError.current = element;
                        }
                      : undefined
                  }
                  type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                  autoComplete={field === "name" ? "name" : field === "email" ? "email" : "tel"}
                  maxLength={field === "name" ? 120 : field === "email" ? 200 : 60}
                  name={field}
                  required={field !== "phone"}
                  value={values[field]}
                  onChange={(event) => update(field, event.target.value)}
                  aria-invalid={Boolean(errors[field])}
                  aria-describedby={errors[field] ? `${field}-order-error` : undefined}
                />
                {errors[field] ? (
                  <span className="public-form-error" id={`${field}-order-error`}>
                    {errors[field]}
                  </span>
                ) : null}
              </label>
            ))}
          </div>

          <label className="public-form-field public-form-field-wide">
            Note per l'ordine (facoltative)
            <textarea
              maxLength={1000}
              name="notes"
              value={values.notes}
              onChange={(event) => update("notes", event.target.value)}
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? "order-notes-error" : undefined}
            />
            {errors.notes ? (
              <span className="public-form-error" id="order-notes-error">
                {errors.notes}
              </span>
            ) : null}
          </label>

          <label className="public-privacy">
            <input
              ref={
                errors.privacyAccepted
                  ? (element) => {
                      if (element && !firstError.current) firstError.current = element;
                    }
                  : undefined
              }
              type="checkbox"
              name="privacyAccepted"
              required
              checked={values.privacyAccepted}
              onChange={(event) => update("privacyAccepted", event.target.checked)}
              aria-invalid={Boolean(errors.privacyAccepted)}
              aria-describedby={errors.privacyAccepted ? "order-privacy-error" : undefined}
            />{" "}
            Acconsento al trattamento dei dati per gestire questo ordine.
          </label>
          {errors.privacyAccepted ? (
            <span className="public-form-error" id="order-privacy-error">
              {errors.privacyAccepted}
            </span>
          ) : null}
        </fieldset>

        <input
          className="public-honeypot"
          name="company"
          value={values.company}
          onChange={(event) => update("company", event.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        <div className="public-form-actions">
          <button
            className="cta-button"
            type="submit"
            aria-describedby="order-total"
            disabled={state === "submitting" || availabilityState !== "ready" || !minimumReached}
          >
            {state === "submitting" ? "Invio ordine in corso…" : "Conferma ordine e ritiro"}
          </button>
        </div>
        {feedback ? (
          <p
            aria-live="polite"
            role={state === "success" ? "status" : "alert"}
            className={state === "success" ? "public-form-success" : "public-form-error"}
          >
            {feedback}
          </p>
        ) : null}
      </form>
    </section>
  );
}
