"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { adminRoleLabel, adminScopeLabel } from "../../lib/admin-labels";
import type { AuthAccess } from "../../lib/platform-api";
import { selectAccessAction, type AdminAuthActionState } from "../admin/actions";

const initialState: AdminAuthActionState = {
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className="admin-button form-button selector-submit"
      data-pending={pending || undefined}
      type="submit"
      disabled={pending}
    >
      <span aria-live="polite">
        {pending ? "Apertura workspace…" : "Apri il workspace selezionato"}
      </span>
    </button>
  );
}

function describeAccess(access: AuthAccess) {
  if (access.scopeType === "platform") {
    return "Gestione completa di città, attività e accessi.";
  }

  if (access.scopeType === "city") {
    return `Amministra ${access.city?.name ?? "la città assegnata"} e le attività del suo ambito.`;
  }

  return `Lavora su ${access.business?.name ?? "l'attività assegnata"} nel relativo spazio operativo.`;
}

function accessContext(access: AuthAccess) {
  if (access.scopeType === "platform") return "CityCore network";
  if (access.scopeType === "city") return access.city?.name ?? "Città";
  return access.business?.name ?? "Attività";
}

function accessMark(access: AuthAccess) {
  if (access.scopeType === "platform") return "CC";
  return accessContext(access)
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ErrorBanner({ state }: { state: AdminAuthActionState }) {
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state.error]);

  if (!state.error) {
    return null;
  }

  return (
    <p aria-live="polite" className="form-error" ref={errorRef} role="alert" tabIndex={-1}>
      {state.error}
    </p>
  );
}

export function AccessSelector({
  accesses,
  currentAccessId,
}: {
  accesses: AuthAccess[];
  currentAccessId: string;
}) {
  const [state, formAction] = useActionState(selectAccessAction, initialState);

  return (
    <form action={formAction} aria-label="Scelta dell'accesso operativo" className="selector-card">
      <div className="selector-list" role="radiogroup" aria-label="Accessi disponibili">
        {accesses.map((access) => {
          const isCurrent = access.id === currentAccessId;
          const descriptionId = `access-description-${access.id}`;
          return (
            <label
              aria-current={isCurrent ? "true" : undefined}
              className={`selector-item${isCurrent ? " is-current" : ""}`}
              key={access.id}
            >
              <input
                aria-describedby={descriptionId}
                defaultChecked={isCurrent}
                name="accessGrantId"
                required
                type="radio"
                value={access.id}
              />
              <span className="selector-mark" aria-hidden="true">
                {accessMark(access)}
              </span>
              <div className="selector-copy">
                <span className="selector-context">{accessContext(access)}</span>
                <strong>{adminRoleLabel(access.role)}</strong>
                <p id={descriptionId}>{describeAccess(access)}</p>
                <div className="pill-row">
                  {isCurrent ? <span className="pill">In uso</span> : null}
                  <span className="pill">{adminScopeLabel(access.scopeType)}</span>
                  {access.city && access.scopeType === "business" ? (
                    <span className="pill">{access.city.name}</span>
                  ) : null}
                </div>
              </div>
              <span className="selector-check" aria-hidden="true">
                ✓
              </span>
            </label>
          );
        })}
      </div>

      <ErrorBanner state={state} />
      <div className="selector-footer">
        <p>La selezione cambia il contesto operativo, non i permessi assegnati al tuo account.</p>
        <SubmitButton />
      </div>
    </form>
  );
}
