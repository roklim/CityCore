"use client";

import { useEffect, useState } from "react";
import { AdminSubmitButton } from "../../../components/admin-submit-button";
import { adminScopeLabel } from "../../../lib/admin-labels";
import type { AdminBusinessLookupItem, AdminCityLookupItem } from "../../../lib/admin-lookups";
import { searchAdminBusinessesAction, searchAdminCitiesAction } from "../lookup-actions";
import { createAccessGrantAction } from "../platform-actions";

type AccessRole = "global_admin" | "city_admin" | "local_admin" | "staff";

function cityLabel(city: AdminCityLookupItem) {
  const location = city.region ?? city.admin1Name ?? city.countryName ?? city.country;
  return `${city.name}${location ? ` · ${location}` : ""}`;
}

export function AccessGrantForm({
  cities,
  businesses,
  isPlatformScope,
  returnTo,
}: {
  cities: AdminCityLookupItem[];
  businesses: AdminBusinessLookupItem[];
  isPlatformScope: boolean;
  returnTo: string;
}) {
  const [role, setRole] = useState<AccessRole>(
    isPlatformScope
      ? businesses.length
        ? "local_admin"
        : cities.length
          ? "city_admin"
          : "global_admin"
      : "city_admin",
  );
  const [citySlug, setCitySlug] = useState(businesses[0]?.city.slug ?? cities[0]?.slug ?? "");
  const [businessSlug, setBusinessSlug] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [businessQuery, setBusinessQuery] = useState("");
  const [cityOptions, setCityOptions] = useState(cities);
  const [businessOptions, setBusinessOptions] = useState(businesses);
  const [citySearchPending, setCitySearchPending] = useState(false);
  const [businessSearchPending, setBusinessSearchPending] = useState(false);
  const [lookupError, setLookupError] = useState(false);
  const scopeType =
    role === "global_admin" ? "platform" : role === "city_admin" ? "city" : "business";

  useEffect(() => {
    if (scopeType === "platform") return;
    const timer = window.setTimeout(() => {
      setCitySearchPending(true);
      setLookupError(false);
      void searchAdminCitiesAction(cityQuery, false)
        .then((items) => {
          setCityOptions((current) => {
            const selected = current.find((item) => item.slug === citySlug);
            if (selected && !items.some((item) => item.slug === selected.slug)) {
              return [selected, ...items];
            }
            return items;
          });
        })
        .catch(() => setLookupError(true))
        .finally(() => setCitySearchPending(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [cityQuery, citySlug, scopeType]);

  useEffect(() => {
    if (scopeType !== "business" || !citySlug) {
      setBusinessSlug("");
      return;
    }
    const timer = window.setTimeout(() => {
      setBusinessSearchPending(true);
      setLookupError(false);
      void searchAdminBusinessesAction(businessQuery, citySlug)
        .then((items) => {
          setBusinessOptions(items);
          setBusinessSlug((current) =>
            current && items.some((item) => item.slug === current) ? current : "",
          );
        })
        .catch(() => setLookupError(true))
        .finally(() => setBusinessSearchPending(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [businessQuery, citySlug, scopeType]);

  return (
    <form action={createAccessGrantAction} className="admin-edit-form">
      <input name="returnTo" type="hidden" value={returnTo} />
      <label className="field">
        <span>Email utente</span>
        <input autoComplete="email" name="userEmail" required type="email" />
      </label>
      <label className="field">
        <span>Nome utente (facoltativo)</span>
        <input autoComplete="name" name="userName" />
      </label>
      <label className="field">
        <span>Password temporanea</span>
        <input
          autoComplete="new-password"
          minLength={12}
          name="password"
          required
          type="password"
        />
        <small>
          Minimo 12 caratteri. Attiva un nuovo account; se l&apos;email esiste già, la sua
          password non viene modificata.
        </small>
      </label>
      <label className="field">
        <span>Ruolo</span>
        <select
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value as AccessRole)}
        >
          {isPlatformScope ? (
            <option value="global_admin">Amministratore piattaforma</option>
          ) : null}
          <option disabled={!cities.length} value="city_admin">
            Amministratore città
          </option>
          <option disabled={!businesses.length} value="local_admin">
            Gestore attività
          </option>
          <option disabled={!businesses.length} value="staff">
            Staff attività
          </option>
        </select>
      </label>
      <div className="admin-derived-scope">
        <span>Ambito assegnato</span>
        <strong>{adminScopeLabel(scopeType)}</strong>
      </div>
      {scopeType !== "platform" ? (
        <>
          <label className="field admin-field-wide">
            <span>Cerca città</span>
            <input
              onChange={(event) => setCityQuery(event.target.value)}
              placeholder="Cerca in tutte le città accessibili"
              type="search"
              value={cityQuery}
            />
            <small>{citySearchPending ? "Ricerca città…" : "Massimo 20 suggerimenti per ricerca."}</small>
          </label>
          <label className="field">
            <span>Città</span>
            <select
              name="citySlug"
              required
              value={citySlug}
              onChange={(event) => {
                setCitySlug(event.target.value);
                setBusinessSlug("");
                setBusinessQuery("");
              }}
            >
              <option disabled value="">
                {cityOptions.length ? "Seleziona città" : "Nessuna città trovata"}
              </option>
              {cityOptions.map((city) => (
                <option key={city.id} value={city.slug}>
                  {cityLabel(city)}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
      {scopeType === "business" ? (
        <>
          <label className="field admin-field-wide">
            <span>Cerca attività</span>
            <input
              disabled={!citySlug}
              onChange={(event) => setBusinessQuery(event.target.value)}
              placeholder="Cerca tra tutte le attività della città"
              type="search"
              value={businessQuery}
            />
            <small>
              {businessSearchPending
                ? "Ricerca attività…"
                : "La ricerca è filtrata server-side sulla città selezionata."}
            </small>
          </label>
          <label className="field">
            <span>Attività</span>
            <select
              name="businessSlug"
              required
              value={businessSlug}
              onChange={(event) => setBusinessSlug(event.target.value)}
            >
              <option disabled value="">
                {businessOptions.length
                  ? "Seleziona attività"
                  : "Nessuna attività disponibile in questa città"}
              </option>
              {businessOptions.map((business) => (
                <option key={business.id} value={business.slug}>
                  {business.name}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
      {lookupError ? (
        <p className="surface-error" role="alert">
          Ricerca non disponibile. Riprova.
        </p>
      ) : null}
      <label className="admin-check-field">
        <input defaultChecked name="active" type="checkbox" /> Accesso attivo
      </label>
      <AdminSubmitButton pendingLabel="Assegnazione…">Assegna accesso</AdminSubmitButton>
    </form>
  );
}
