"use client";

import { useEffect, useState } from "react";
import { AdminSubmitButton } from "../../../components/admin-submit-button";
import type { AdminCityLookupItem } from "../../../lib/admin-lookups";
import type { PlatformTemplate } from "../../../lib/platform-api";
import { searchAdminCitiesAction } from "../lookup-actions";
import { createBusinessAction } from "../platform-actions";

function cityLabel(city: AdminCityLookupItem) {
  const location = city.region ?? city.admin1Name ?? city.countryName ?? city.country;
  return `${city.name}${location ? ` · ${location}` : ""}`;
}

export function BusinessCreateForm({
  cities,
  templates,
  defaultCity,
  returnTo,
}: {
  cities: AdminCityLookupItem[];
  templates: PlatformTemplate[];
  defaultCity: string;
  returnTo: string;
}) {
  const [assignOwner, setAssignOwner] = useState(false);
  const [templateCode, setTemplateCode] = useState(templates[0]?.code ?? "");
  const [cityQuery, setCityQuery] = useState("");
  const [cityOptions, setCityOptions] = useState(cities);
  const [citySlug, setCitySlug] = useState(defaultCity || cities[0]?.slug || "");
  const [citySearchPending, setCitySearchPending] = useState(false);
  const [citySearchError, setCitySearchError] = useState(false);
  const selectedTemplate = templates.find((item) => item.code === templateCode);
  const selectedCity = cityOptions.find((item) => item.slug === citySlug) ?? null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCitySearchPending(true);
      setCitySearchError(false);
      void searchAdminCitiesAction(cityQuery, true)
        .then((items) => {
          setCityOptions((current) => {
            const selected = current.find((item) => item.slug === citySlug);
            if (selected && !items.some((item) => item.slug === selected.slug)) {
              return [selected, ...items];
            }
            return items;
          });
        })
        .catch(() => setCitySearchError(true))
        .finally(() => setCitySearchPending(false));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [cityQuery, citySlug]);

  return (
    <form action={createBusinessAction} className="admin-edit-form">
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="timezone" type="hidden" value={selectedCity?.timezone ?? ""} />
      <label className="field">
        <span>Nome attività</span>
        <input minLength={2} name="name" required />
      </label>
      <label className="field">
        <span>Slug (facoltativo)</span>
        <input name="slug" />
      </label>
      <label className="field admin-field-wide">
        <span>Cerca città</span>
        <input
          aria-describedby="business-city-search-hint"
          onChange={(event) => setCityQuery(event.target.value)}
          placeholder="Es. New York, Tokyo, Roma"
          type="search"
          value={cityQuery}
        />
        <small id="business-city-search-hint">
          {citySearchPending
            ? "Ricerca città…"
            : citySearchError
              ? "Ricerca non disponibile. Riprova."
              : "La ricerca interroga tutte le città attive e pronte del tuo ambito."}
        </small>
      </label>
      <label className="field">
        <span>Città</span>
        <select
          name="citySlug"
          required
          value={citySlug}
          onChange={(event) => setCitySlug(event.target.value)}
        >
          <option disabled value="">
            {cityOptions.length ? "Seleziona città" : "Nessuna città trovata"}
          </option>
          {cityOptions.map((item) => (
            <option key={item.id} value={item.slug}>
              {cityLabel(item)} · {item.activeCategoryCount} categorie
            </option>
          ))}
        </select>
        {selectedCity?.timezone ? <small>Timezone: {selectedCity.timezone}</small> : null}
      </label>
      <label className="field">
        <span>Tipo di attività</span>
        <select
          name="templateCode"
          required
          value={templateCode}
          onChange={(event) => setTemplateCode(event.target.value)}
        >
          {templates.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
        {selectedTemplate ? <small>{selectedTemplate.summary}</small> : null}
      </label>
      <label className="field">
        <span>Email pubblica</span>
        <input name="publicEmail" type="email" />
      </label>
      <label className="field">
        <span>Telefono pubblico</span>
        <input name="publicPhone" type="tel" />
      </label>
      <label className="admin-check-field admin-field-wide">
        <input
          checked={assignOwner}
          name="assignOwner"
          onChange={(event) => setAssignOwner(event.target.checked)}
          type="checkbox"
        />{" "}
        Assegna il gestore e prepara subito il suo accesso
      </label>
      {assignOwner ? (
        <>
          <label className="field">
            <span>Email gestore</span>
            <input autoComplete="email" name="ownerEmail" required type="email" />
          </label>
          <label className="field">
            <span>Nome gestore</span>
            <input autoComplete="name" maxLength={120} name="ownerName" />
          </label>
          <label className="field">
            <span>Telefono gestore (facoltativo)</span>
            <input autoComplete="tel" maxLength={60} name="ownerPhone" type="tel" />
          </label>
          <label className="field">
            <span>Password temporanea</span>
            <input
              autoComplete="new-password"
              minLength={12}
              name="ownerPassword"
              required
              type="password"
            />
            <small>Almeno 12 caratteri. Condividila al gestore attraverso un canale sicuro.</small>
          </label>
        </>
      ) : null}
      <p className="admin-form-note">
        Lo slug viene generato dal nome se lo lasci vuoto. L'attività nasce in bozza e non è
        visibile al pubblico finché la checklist non è completa.
      </p>
      <AdminSubmitButton pendingLabel="Creazione…">Crea attività</AdminSubmitButton>
    </form>
  );
}
