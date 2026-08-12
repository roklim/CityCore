"use client";

import { useState } from "react";
import { AdminSubmitButton } from "../../../components/admin-submit-button";
import type { PlatformCity, PlatformTemplate } from "../../../lib/platform-api";
import { createBusinessAction } from "../platform-actions";

export function BusinessCreateForm({
  cities,
  templates,
  defaultCity,
  returnTo,
}: {
  cities: PlatformCity[];
  templates: PlatformTemplate[];
  defaultCity: string;
  returnTo: string;
}) {
  const [assignOwner, setAssignOwner] = useState(false);
  const [templateCode, setTemplateCode] = useState(templates[0]?.code ?? "");
  const selectedTemplate = templates.find((item) => item.code === templateCode);

  return (
    <form action={createBusinessAction} className="admin-edit-form">
      <input name="returnTo" type="hidden" value={returnTo} />
      <label className="field">
        <span>Nome attività</span>
        <input minLength={2} name="name" required />
      </label>
      <label className="field">
        <span>Slug (facoltativo)</span>
        <input name="slug" />
      </label>
      <label className="field">
        <span>Città</span>
        <select name="citySlug" required defaultValue={defaultCity}>
          <option disabled value="">
            Seleziona città
          </option>
          {cities.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name} · {item.activeCategoryCount} categorie
            </option>
          ))}
        </select>
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
