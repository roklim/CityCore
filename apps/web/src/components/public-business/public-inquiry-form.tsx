"use client";

import { type FormEvent, useRef, useState } from "react";

import {
  createPublicBusinessInquiry,
  PlatformApiError,
  type PublicInquiryPayload,
} from "../../lib/platform-api";

type FormValues = Omit<PublicInquiryPayload, "privacyAccepted"> & { privacyAccepted: boolean };
type FieldErrors = Partial<Record<keyof FormValues, string>>;

const initialValues: FormValues = {
  name: "",
  email: "",
  phone: "",
  message: "",
  privacyAccepted: false,
  company: "",
};

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (values.name.trim().length < 2 || values.name.trim().length > 120)
    errors.name = "Inserisci un nome valido.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(values.email))
    errors.email = "Inserisci un indirizzo email valido.";
  if (values.phone && (values.phone.trim().length > 60 || /<[^>]*>/u.test(values.phone)))
    errors.phone = "Inserisci un telefono valido.";
  if (values.message.trim().length < 10 || values.message.trim().length > 4000)
    errors.message = "Il messaggio deve contenere da 10 a 4000 caratteri.";
  if (!values.privacyAccepted) errors.privacyAccepted = "Il consenso privacy è obbligatorio.";
  return errors;
}

function messageFor(error: unknown) {
  if (error instanceof PlatformApiError) {
    if (error.status === 429)
      return "Hai inviato troppe richieste in poco tempo. Riprova più tardi.";
    if (error.status === 404) return "Questa attività non è disponibile per nuove richieste.";
    if (error.status === 400) return "Controlla i dati inseriti e riprova.";
  }
  return "Non è stato possibile inviare la richiesta. Controlla la connessione e riprova.";
}

export function PublicInquiryForm({
  citySlug,
  businessSlug,
}: {
  citySlug: string;
  businessSlug: string;
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const firstError = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    firstError.current = null;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setState("error");
      setFeedback("Controlla i campi evidenziati.");
      requestAnimationFrame(() => firstError.current?.focus());
      return;
    }
    setState("submitting");
    setFeedback("");
    try {
      await createPublicBusinessInquiry(citySlug, businessSlug, {
        ...values,
        privacyAccepted: true,
      });
      setValues(initialValues);
      setErrors({});
      setState("success");
      setFeedback("Richiesta inviata. L’attività potrà ricontattarti usando i dati forniti.");
    } catch (error) {
      setState("error");
      setFeedback(messageFor(error));
    }
  }

  return (
    <form className="public-inquiry-form" id="contact" onSubmit={submit} noValidate>
      <p className="section-label">Contatti</p>
      <h2>Invia una richiesta</h2>
      <p>Riceverai una risposta usando i dati che hai fornito.</p>
      <div className="public-form-grid">
        {(["name", "email", "phone"] as const).map((field) => (
          <label key={field}>
            {field === "name" ? "Nome" : field === "email" ? "Email" : "Telefono (facoltativo)"}
            <input
              ref={
                errors[field]
                  ? (element) => {
                      if (element && !firstError.current) firstError.current = element;
                    }
                  : undefined
              }
              type={field === "email" ? "email" : "text"}
              value={values[field]}
              onChange={(event) => update(field, event.target.value)}
              aria-invalid={Boolean(errors[field])}
              aria-describedby={errors[field] ? `${field}-error` : undefined}
            />
            {errors[field] ? (
              <span id={`${field}-error`} className="public-form-error">
                {errors[field]}
              </span>
            ) : null}
          </label>
        ))}
      </div>
      <label>
        Messaggio
        <textarea
          ref={
            errors.message
              ? (element) => {
                  if (element && !firstError.current) firstError.current = element;
                }
              : undefined
          }
          value={values.message}
          onChange={(event) => update("message", event.target.value)}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
        />
        {errors.message ? (
          <span id="message-error" className="public-form-error">
            {errors.message}
          </span>
        ) : null}
      </label>
      <label className="public-privacy">
        <input
          type="checkbox"
          checked={values.privacyAccepted}
          onChange={(event) => update("privacyAccepted", event.target.checked)}
        />{" "}
        Acconsento al trattamento dei dati forniti esclusivamente per ricevere risposta a questa
        richiesta.
      </label>
      {errors.privacyAccepted ? (
        <span className="public-form-error">{errors.privacyAccepted}</span>
      ) : null}
      <input
        className="public-honeypot"
        name="company"
        value={values.company}
        onChange={(event) => update("company", event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      <button className="cta-button" disabled={state === "submitting"} type="submit">
        {state === "submitting" ? "Invio in corso..." : "Invia richiesta"}
      </button>
      {feedback ? (
        <p
          aria-live="polite"
          className={state === "success" ? "public-form-success" : "public-form-error"}
        >
          {feedback}
        </p>
      ) : null}
    </form>
  );
}
