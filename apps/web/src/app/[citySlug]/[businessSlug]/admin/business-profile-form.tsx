"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlatformBusiness } from "../../../../lib/platform-api";
import { socialFields, type SocialField } from "../../../../lib/business-admin-logic";
import { updateBusinessProfileAction, type BusinessMutationState } from "./actions";

const initialState: BusinessMutationState = { error: null, notice: null };
const socialLabels: Record<SocialField, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
};
const supportedTimezones = ["Europe/Rome", "Europe/Paris", "Europe/Berlin", "Europe/London", "UTC"];
const supportedCurrencies = ["EUR", "CHF", "GBP", "USD"];
const supportedLocales = ["it-IT", "en-GB", "en-US", "fr-FR", "de-DE"];

function includeCurrent(options: string[], current: string) {
  return options.includes(current) ? options : [current, ...options];
}

export function BusinessProfileForm({ business }: { business: PlatformBusiness }) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, setState] = useState(initialState);
  const [isDirty, setIsDirty] = useState(false);
  const [name, setName] = useState(business.name);
  const [slug, setSlug] = useState(business.slug);
  const socialLinks = business.socialLinks ?? {};

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    const result = await updateBusinessProfileAction(
      initialState,
      new FormData(event.currentTarget),
    );
    setState(result);
    if (result.notice) {
      const nextSlug = result.nextBusinessSlug ?? business.slug;
      setIsDirty(false);
      submittingRef.current = false;
      setIsSubmitting(false);
      if (nextSlug !== business.slug) {
        router.replace(
          `/${encodeURIComponent(business.city.slug)}/${encodeURIComponent(nextSlug)}/admin/profile?notice=${encodeURIComponent(result.notice)}`,
        );
      } else {
        router.refresh();
      }
      return;
    }
    submittingRef.current = false;
    setIsSubmitting(false);
  }

  return (
    <form
      aria-busy={isSubmitting}
      className="business-management-form"
      onChange={() => setIsDirty(true)}
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="citySlug" value={business.city.slug} />
      <input type="hidden" name="businessSlug" value={business.slug} />
      <input type="hidden" name="businessStatus" value={business.status} />
      <fieldset className="business-form-fieldset" disabled={isSubmitting}>
        <legend>Identità pubblica</legend>
        <p className="admin-form-note">
          Questi testi identificano l’attività nella directory e nella scheda pubblica. Per
          pubblicare servono il nome e almeno un sottotitolo o una descrizione.
        </p>
        <div className="business-profile-grid">
          <label className="field">
            <span>Nome *</span>
            <input
              aria-describedby="business-name-help"
              aria-invalid={name.trim().length < 2}
              maxLength={160}
              name="name"
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
            <small id="business-name-help">
              Nome ufficiale dell'attività; il titolo pubblico può sostituirlo nelle superfici
              pubbliche.
            </small>
          </label>
          <label className="field">
            <span>Slug</span>
            <input
              aria-describedby="business-slug-help"
              aria-invalid={!slug.trim()}
              maxLength={160}
              name="slug"
              onChange={(event) => setSlug(event.target.value)}
              readOnly={business.status === "active"}
              required
              value={slug}
            />
            <small id="business-slug-help">
              {business.status === "active"
                ? "Per modificare lo slug devi prima rimuovere l'attività dalla pubblicazione."
                : "Identificatore usato nell'indirizzo pubblico."}
            </small>
          </label>
          <label className="field">
            <span>Titolo pubblico</span>
            <input defaultValue={business.publicTitle ?? ""} maxLength={160} name="publicTitle" />
            <small>Facoltativo: se presente sostituisce il nome nella scheda pubblica.</small>
          </label>
          <label className="field">
            <span>Sottotitolo pubblico</span>
            <input
              defaultValue={business.publicSubtitle ?? ""}
              maxLength={200}
              name="publicSubtitle"
            />
          </label>
        </div>
        <label className="field">
          <span>Descrizione pubblica</span>
          <textarea
            defaultValue={business.publicDescription ?? ""}
            maxLength={2000}
            name="publicDescription"
          />
          <small>
            Spiega in modo concreto cosa offre l’attività; è alternativa al sottotitolo per la
            readiness.
          </small>
        </label>
      </fieldset>

      <fieldset className="business-form-fieldset" disabled={isSubmitting}>
        <legend>Contatti</legend>
        <p className="admin-form-note">
          Per pubblicare serve almeno un telefono, un’email o il sito. Telefono ed email offrono un
          contatto più diretto.
        </p>
        <div className="business-profile-grid">
          <label className="field">
            <span>Telefono pubblico</span>
            <input
              autoComplete="tel"
              defaultValue={business.publicPhone ?? ""}
              maxLength={60}
              name="publicPhone"
              type="tel"
            />
          </label>
          <label className="field">
            <span>Email pubblica</span>
            <input
              autoComplete="email"
              defaultValue={business.publicEmail ?? ""}
              name="publicEmail"
              type="email"
            />
          </label>
          <label className="field">
            <span>Sito web</span>
            <input defaultValue={business.website ?? ""} name="website" type="url" />
          </label>
        </div>
      </fieldset>

      <fieldset className="business-form-fieldset" disabled={isSubmitting}>
        <legend>Indirizzo</legend>
        <p className="admin-form-note">
          Usa l’indirizzo che gli utenti devono raggiungere; lascia vuoti i campi non applicabili.
        </p>
        <div className="business-profile-grid">
          <label className="field">
            <span>Indirizzo</span>
            <input
              autoComplete="address-line1"
              defaultValue={business.addressLine1 ?? ""}
              maxLength={160}
              name="addressLine1"
            />
          </label>
          <label className="field">
            <span>Indirizzo, seconda riga</span>
            <input
              autoComplete="address-line2"
              defaultValue={business.addressLine2 ?? ""}
              maxLength={160}
              name="addressLine2"
            />
          </label>
          <label className="field">
            <span>CAP</span>
            <input
              autoComplete="postal-code"
              defaultValue={business.postalCode ?? ""}
              maxLength={20}
              name="postalCode"
            />
          </label>
          <label className="field">
            <span>Località</span>
            <input
              autoComplete="address-level2"
              defaultValue={business.locality ?? ""}
              maxLength={120}
              name="locality"
            />
          </label>
          <label className="field">
            <span>Provincia</span>
            <input
              autoComplete="address-level1"
              defaultValue={business.province ?? ""}
              maxLength={120}
              name="province"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="business-form-fieldset" disabled={isSubmitting}>
        <legend>Impostazioni locali</legend>
        <p className="admin-form-note">
          Queste impostazioni controllano formati, prezzi e calcolo degli orari pubblici.
        </p>
        <div className="business-profile-grid">
          <label className="field">
            <span>Timezone</span>
            <select defaultValue={business.timezone} name="timezone" required>
              {includeCurrent(supportedTimezones, business.timezone).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <small>Determina orari, stato aperto/chiuso e fasce di ritiro.</small>
          </label>
          <label className="field">
            <span>Valuta</span>
            <select defaultValue={business.currency} name="currency" required>
              {includeCurrent(supportedCurrencies, business.currency).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Lingua e formato</span>
            <select defaultValue={business.locale} name="locale" required>
              {includeCurrent(supportedLocales, business.locale).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="business-form-fieldset" disabled={isSubmitting}>
        <legend>Social</legend>
        <p className="admin-form-note">Inserisci URL completi, per esempio https://…</p>
        <div className="business-profile-grid">
          {socialFields.map((field) => (
            <label className="field" key={field}>
              <span>{socialLabels[field]}</span>
              <input
                defaultValue={socialLinks[field] ?? ""}
                name={field}
                placeholder={`https://${field}.com/...`}
                type="url"
              />
            </label>
          ))}
        </div>
      </fieldset>

      {state.error ? (
        <p className="surface-error" role="alert">
          {state.error} I dati inseriti sono stati conservati.
        </p>
      ) : null}
      {state.notice ? (
        <p className="surface-success" role="status">
          {state.notice}
        </p>
      ) : null}
      {isDirty ? <p className="business-unsaved-indicator">Modifiche non salvate</p> : null}
      <button className="admin-button form-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Salvataggio…" : "Salva profilo"}
      </button>
    </form>
  );
}
