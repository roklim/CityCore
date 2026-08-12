"use client";

import { useMemo, useState } from "react";
import { AdminSubmitButton } from "../../../components/admin-submit-button";
import { adminScopeLabel } from "../../../lib/admin-labels";
import type { PlatformBusiness, PlatformCity } from "../../../lib/platform-api";
import { createAccessGrantAction } from "../platform-actions";

type AccessRole = "global_admin" | "city_admin" | "local_admin" | "staff";

export function AccessGrantForm({
  cities,
  businesses,
  isPlatformScope,
  returnTo,
}: {
  cities: PlatformCity[];
  businesses: PlatformBusiness[];
  isPlatformScope: boolean;
  returnTo: string;
}) {
  const [role, setRole] = useState<AccessRole>(
    isPlatformScope ? (cities.length ? "local_admin" : "global_admin") : "city_admin",
  );
  const [citySlug, setCitySlug] = useState(cities[0]?.slug ?? "");
  const scopeType =
    role === "global_admin" ? "platform" : role === "city_admin" ? "city" : "business";
  const availableBusinesses = useMemo(
    () => businesses.filter((business) => !citySlug || business.city.slug === citySlug),
    [businesses, citySlug],
  );

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
          Minimo 12 caratteri. Attiva un nuovo account; se l&apos;email esiste gi&agrave;, la sua
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
          <option value="city_admin">Amministratore città</option>
          <option value="local_admin">Owner attività</option>
          <option value="staff">Staff attività</option>
        </select>
      </label>
      <div className="admin-derived-scope">
        <span>Scope assegnato</span>
        <strong>{adminScopeLabel(scopeType)}</strong>
      </div>
      {scopeType !== "platform" ? (
        <label className="field">
          <span>Città</span>
          <select
            name="citySlug"
            required
            value={citySlug}
            onChange={(event) => setCitySlug(event.target.value)}
          >
            {cities.map((city) => (
              <option key={city.id} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {scopeType === "business" ? (
        <label className="field">
          <span>Attività</span>
          <select key={citySlug} name="businessSlug" required defaultValue="">
            <option disabled value="">
              Seleziona attività
            </option>
            {availableBusinesses.map((business) => (
              <option key={business.id} value={business.slug}>
                {business.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="admin-check-field">
        <input defaultChecked name="active" type="checkbox" /> Accesso attivo
      </label>
      <AdminSubmitButton pendingLabel="Assegnazione…">Assegna accesso</AdminSubmitButton>
    </form>
  );
}
