"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import { createPublicBusinessInquiry, PlatformApiError } from "../../lib/platform-api";
import {
  validatePublicInquiryValues,
  type PublicInquiryFieldErrors,
  type PublicInquiryFormValues,
} from "../../lib/public-form-validation";

const initialValues: PublicInquiryFormValues = {
  name: "",
  email: "",
  phone: "",
  message: "",
  privacyAccepted: false,
  company: "",
};

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
  const [errors, setErrors] = useState<PublicInquiryFieldErrors>({});
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const firstError = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const submittingRef = useRef(false);
  const shouldFocusErrorsRef = useRef(false);

  useEffect(() => {
    if (!shouldFocusErrorsRef.current) return;
    shouldFocusErrorsRef.current = false;
    firstError.current?.focus();
  }, [errors]);

  function update<K extends keyof PublicInquiryFormValues>(
    key: K,
    value: PublicInquiryFormValues[K],
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const nextErrors = validatePublicInquiryValues(values);
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
      await createPublicBusinessInquiry(citySlug, businessSlug, {
        name: values.name,
        email: values.email,
        phone: values.phone.trim() || undefined,
        message: values.message,
        company: values.company,
        privacyAccepted: true,
      });
      setValues(initialValues);
      setErrors({});
      setState("success");
      setFeedback("Richiesta inviata. L’attività potrà ricontattarti usando i dati forniti.");
    } catch (error) {
      setState("error");
      setFeedback(messageFor(error));
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <form
      aria-busy={state === "submitting"}
      aria-labelledby="public-inquiry-title"
      aria-describedby="public-inquiry-description"
      className="public-inquiry-form public-contact-form"
      id="inquiry-form"
      onSubmit={submit}
      noValidate
    >
      <div className="public-form-header">
        <p className="section-label">Richieste</p>
        <h2 id="public-inquiry-title">Contatta l'attività</h2>
        <p id="public-inquiry-description">
          Inserisci i tuoi recapiti e spiega di cosa hai bisogno. L'attività potrà risponderti
          direttamente.
        </p>
      </div>
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
      <label className="public-form-field public-form-field-wide">
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
          maxLength={4000}
          name="message"
          required
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
          aria-describedby={errors.privacyAccepted ? "inquiry-privacy-error" : undefined}
        />{" "}
        Acconsento al trattamento dei dati forniti esclusivamente per ricevere risposta a questa
        richiesta.
      </label>
      {errors.privacyAccepted ? (
        <span className="public-form-error" id="inquiry-privacy-error">
          {errors.privacyAccepted}
        </span>
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
      <div className="public-form-actions">
        <button className="cta-button" disabled={state === "submitting"} type="submit">
          {state === "submitting" ? "Invio in corso..." : "Invia richiesta"}
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
  );
}
