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
    <button className="form-button" type="submit" disabled={pending}>
      {pending ? "Attivazione..." : "Apri superficie"}
    </button>
  );
}

function describeAccess(access: AuthAccess) {
  if (access.scopeType === "platform") {
    return "Governance completa della piattaforma.";
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

export function AccessSelector({ accesses }: { accesses: AuthAccess[] }) {
  const [state, formAction] = useActionState(selectAccessAction, initialState);

  return (
    <form action={formAction} className="selector-card">
      <div className="selector-list">
        {accesses.map((access) => (
          <label className="selector-item" key={access.id}>
            <input
              type="radio"
              name="accessGrantId"
              value={access.id}
              defaultChecked={access === accesses[0]}
            />
            <div className="selector-copy">
              <strong>{adminRoleLabel(access.role)}</strong>
              <p>{describeAccess(access)}</p>
              <div className="pill-row">
                <span className="pill">{adminScopeLabel(access.scopeType)}</span>
                {access.city ? <span className="pill">{access.city.name}</span> : null}
                {access.business ? <span className="pill">{access.business.name}</span> : null}
              </div>
            </div>
          </label>
        ))}
      </div>

      <ErrorBanner state={state} />
      <SubmitButton />
    </form>
  );
}
