"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlatformBusinessService } from "../../../../lib/platform-api";
import {
  archiveMenuItemAction,
  createMenuItemAction,
  createMenuItemProgressiveAction,
  deleteMenuItemAction,
  updateMenuItemAction,
  updateMenuItemProgressiveAction,
  type BusinessMutationState,
} from "./actions";

const initialState: BusinessMutationState = { error: null, notice: null };

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

function ServiceFields({
  currency,
  service,
  disabled,
}: {
  currency: string;
  service?: PlatformBusinessService;
  disabled: boolean;
}) {
  return (
    <fieldset className="business-form-fieldset" disabled={disabled}>
      <legend>{service ? `Modifica ${service.name}` : "Nuovo servizio"}</legend>
      <div className="business-menu-fields">
        <label className="field">
          <span>Nome</span>
          <input defaultValue={service?.name ?? ""} maxLength={160} name="name" required />
        </label>
        <label className="field">
          <span>Slug</span>
          <input defaultValue={service?.slug ?? ""} maxLength={160} name="slug" />
        </label>
        <label className="field">
          <span>Stato</span>
          <select defaultValue={service?.status ?? "draft"} name="status">
            <option value="draft">Bozza</option>
            <option value="in_review">In revisione</option>
            <option value="published">Pubblicato</option>
            <option value="archived">Archiviato</option>
          </select>
        </label>
        <label className="field">
          <span>Prezzo ({currency})</span>
          <input
            defaultValue={formatMenuPrice(service?.priceCents ?? null)}
            inputMode="decimal"
            name="price"
            pattern="[0-9]+([,.][0-9]{1,2})?"
            placeholder="8,50"
          />
        </label>
        <label className="field">
          <span>Etichetta prezzo</span>
          <input defaultValue={service?.priceLabel ?? ""} maxLength={80} name="priceLabel" />
        </label>
        <label className="field">
          <span>Durata (minuti)</span>
          <input
            defaultValue={service?.durationMinutes ?? ""}
            max={1440}
            min={1}
            name="durationMinutes"
            type="number"
          />
        </label>
        <label className="field">
          <span>Ordine</span>
          <input
            defaultValue={service?.sortOrder ?? 0}
            max={10000}
            min={0}
            name="sortOrder"
            required
            type="number"
          />
        </label>
      </div>
      <label className="field">
        <span>Descrizione breve</span>
        <textarea
          defaultValue={service?.shortDescription ?? ""}
          maxLength={280}
          name="shortDescription"
        />
      </label>
      <label className="field">
        <span>Descrizione completa</span>
        <textarea defaultValue={service?.description ?? ""} maxLength={5000} name="description" />
      </label>
    </fieldset>
  );
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
  const router = useRouter();
  const submittingRef = useRef(false);
  const [state, setState] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const form = event.currentTarget;
    submittingRef.current = true;
    setIsSubmitting(true);
    const result = await createMenuItemAction(initialState, new FormData(event.currentTarget));
    setState(result);
    if (result.notice) {
      form.reset();
      submittingRef.current = false;
      setIsSubmitting(false);
      router.refresh();
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
      <input
        type="hidden"
        name="returnTo"
        value={`/${encodeURIComponent(citySlug)}/${encodeURIComponent(businessSlug)}/admin/services`}
      />
      <ServiceFields currency={currency} disabled={isSubmitting} />
      <ActionFeedback state={state} />
      <button className="form-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Creazione…" : "Crea servizio"}
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
  const router = useRouter();
  const submittingRef = useRef(false);
  const [state, setState] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    const result = await updateMenuItemAction(initialState, new FormData(event.currentTarget));
    setState(result);
    if (result.notice) {
      submittingRef.current = false;
      setIsSubmitting(false);
      router.refresh();
      return;
    }
    submittingRef.current = false;
    setIsSubmitting(false);
  }

  return (
    <article className="business-menu-row">
      <form
        action={updateMenuItemProgressiveAction}
        aria-busy={isSubmitting}
        className="business-management-form"
        onSubmit={handleSubmit}
      >
        <input type="hidden" name="citySlug" value={citySlug} />
        <input type="hidden" name="businessSlug" value={businessSlug} />
        <input
          type="hidden"
          name="returnTo"
          value={`/${encodeURIComponent(citySlug)}/${encodeURIComponent(businessSlug)}/admin/services`}
        />
        <input type="hidden" name="serviceId" value={service.id} />
        <ServiceFields currency={currency} disabled={isSubmitting} service={service} />
        <ActionFeedback state={state} />
        <button className="form-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Salvataggio…" : "Salva servizio"}
        </button>
      </form>
      <form
        action={service.status === "archived" ? deleteMenuItemAction : archiveMenuItemAction}
        className="business-delete-form"
        onSubmit={(event) => {
          if (
            service.status === "archived" &&
            !window.confirm(`Eliminare definitivamente “${service.name}”?`)
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="citySlug" value={citySlug} />
        <input type="hidden" name="businessSlug" value={businessSlug} />
        <input type="hidden" name="serviceId" value={service.id} />
        <input
          type="hidden"
          name="returnTo"
          value={`/${encodeURIComponent(citySlug)}/${encodeURIComponent(businessSlug)}/admin/services`}
        />
        <button
          className={`ghost-button${service.status === "archived" ? " danger-button" : ""}`}
          type="submit"
        >
          {service.status === "archived" ? "Elimina definitivamente" : "Archivia servizio"}
        </button>
      </form>
    </article>
  );
}
