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
      className="admin-button form-button"
      data-pending={pending || undefined}
      type="submit"
      disabled={pending}
    >
      <span aria-live="polite">
        {pending ? "Apertura in corso…" : "Continua con l'accesso selezionato"}
      </span>
    </button>
  );
}

function describeAccess(access: AuthAccess) {
  if (access.scopeType === "platform") {
    return "Gestione completa di città, attività e accessi.";
  }

  if (access.scopeType === "city") {
    return `Ambito città: ${access.city?.name ?? "città non disponibile"}.`;
  }

  return `Ambito attività: ${access.business?.name ?? "attività non disponibile"}.`;
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
              className="selector-item"
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
              <div className="selector-copy">
                <strong>{adminRoleLabel(access.role)}</strong>
                <p id={descriptionId}>{describeAccess(access)}</p>
                <div className="pill-row">
                  {isCurrent ? <span className="pill">Accesso in uso</span> : null}
                  <span className="pill">{adminScopeLabel(access.scopeType)}</span>
                  {access.city ? <span className="pill">{access.city.name}</span> : null}
                  {access.business ? <span className="pill">{access.business.name}</span> : null}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <ErrorBanner state={state} />
      <SubmitButton />
    </form>
  );
}
