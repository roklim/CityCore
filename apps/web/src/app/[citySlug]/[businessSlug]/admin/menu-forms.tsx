"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";

import type { PlatformBusinessService } from "../../../../lib/platform-api";
import {
  createMenuItemAction,
  createMenuItemProgressiveAction,
  updateMenuItemAction,
  updateMenuItemProgressiveAction,
  type BusinessMutationState,
} from "./actions";

const initialState: BusinessMutationState = { error: null, notice: null };

function reloadWithNotice(notice: string) {
  const url = new URL(window.location.href);
  url.searchParams.delete("error");
  url.searchParams.set("notice", notice);
  window.location.assign(url);
}

function ActionFeedback({ state }: { state: BusinessMutationState }) {
  if (state.error) {
    return (
      <p aria-live="polite" className="surface-error" role="alert">
        {state.error} I dati inseriti sono stati conservati.
      </p>
    );
  }

  return state.notice ? (
    <p aria-live="polite" className="surface-success" role="status">
      {state.notice}
    </p>
  ) : null;
}

function formatMenuPrice(cents: number | null) {
  return cents === null ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

function serviceStatusLabel(status: PlatformBusinessService["status"]) {
  return {
    draft: "Bozza",
    in_review: "In revisione",
    published: "Pubblicato",
    archived: "Archiviato",
  }[status];
}

export function CreateMenuItemForm({
  citySlug,
  businessSlug,
  currency,
}: {
  citySlug: string;
  businessSlug: string;
  currency: string;
}) {
  const submittingRef = useRef(false);
  const [state, setState] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("published");
  const [description, setDescription] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    const result = await createMenuItemAction(initialState, new FormData(event.currentTarget));
    setState(result);
    if (result.notice) {
      reloadWithNotice(result.notice);
      return;
    }
    submittingRef.current = false;
    setIsSubmitting(false);
  }

  return (
    <form
      action={createMenuItemProgressiveAction}
      aria-busy={isSubmitting}
      className="business-management-form"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="citySlug" value={citySlug} />
      <input type="hidden" name="businessSlug" value={businessSlug} />
      <div className="business-menu-fields">
        <label className="field">
          <span>Nome voce</span>
          <input
            maxLength={160}
            name="name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Es. Pizza margherita"
            required
            value={name}
          />
        </label>
        <label className="field">
          <span>Prezzo ({currency})</span>
          <input
            name="price"
            required
            inputMode="decimal"
            pattern="[0-9]+([,.][0-9]{1,2})?"
            placeholder="8,50"
            onChange={(event) => setPrice(event.target.value)}
            value={price}
          />
        </label>
        <label className="field">
          <span>Stato</span>
          <select name="status" onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="published">Pubblicato</option>
            <option value="draft">Bozza</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>Descrizione (facoltativa)</span>
        <textarea
          name="description"
          maxLength={5000}
          onChange={(event) => setDescription(event.target.value)}
          value={description}
        />
      </label>
      <ActionFeedback state={state} />
      <button className="form-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Aggiunta in corso…" : "Aggiungi al menu"}
      </button>
    </form>
  );
}

export function UpdateMenuItemForm({
  citySlug,
  businessSlug,
  currency,
  service,
}: {
  citySlug: string;
  businessSlug: string;
  currency: string;
  service: PlatformBusinessService;
}) {
  const submittingRef = useRef(false);
  const [state, setState] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(service.name);
  const [price, setPrice] = useState(formatMenuPrice(service.priceCents));
  const [status, setStatus] = useState(service.status);
  const [description, setDescription] = useState(
    service.description ?? service.shortDescription ?? "",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    const result = await updateMenuItemAction(initialState, new FormData(event.currentTarget));
    setState(result);
    if (result.notice) {
      reloadWithNotice(result.notice);
      return;
    }
    submittingRef.current = false;
    setIsSubmitting(false);
  }

  return (
    <form
      action={updateMenuItemProgressiveAction}
      aria-busy={isSubmitting}
      className="business-menu-row"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="citySlug" value={citySlug} />
      <input type="hidden" name="businessSlug" value={businessSlug} />
      <input type="hidden" name="serviceId" value={service.id} />
      <div className="business-menu-fields">
        <label className="field">
          <span>Voce</span>
          <input
            maxLength={160}
            name="name"
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </label>
        <label className="field">
          <span>Prezzo ({currency})</span>
          <input
            name="price"
            required
            inputMode="decimal"
            pattern="[0-9]+([,.][0-9]{1,2})?"
            onChange={(event) => setPrice(event.target.value)}
            value={price}
          />
        </label>
        <label className="field">
          <span>Stato</span>
          <select
            name="status"
            onChange={(event) => setStatus(event.target.value as PlatformBusinessService["status"])}
            value={status}
          >
            <option value="draft">Bozza</option>
            <option value="in_review">In revisione</option>
            <option value="published">Pubblicato</option>
            <option value="archived">Archiviato</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>Descrizione</span>
        <textarea
          name="description"
          maxLength={5000}
          onChange={(event) => setDescription(event.target.value)}
          value={description}
        />
      </label>
      <ActionFeedback state={state} />
      <div className="business-menu-row-footer">
        <span>{serviceStatusLabel(service.status)}</span>
        <button className="ghost-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Salvataggio…" : "Salva voce"}
        </button>
      </div>
    </form>
  );
}
