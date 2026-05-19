"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
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
    return `Scope citta su ${access.city?.name ?? "citta non disponibile"}.`;
  }

  return `Scope business su ${access.business?.name ?? "business non disponibile"}.`;
}

function ErrorBanner({ state }: { state: AdminAuthActionState }) {
  if (!state.error) {
    return null;
  }

  return <p className="form-error">{state.error}</p>;
}

export function AccessSelector({
  accesses,
  sessionToken,
}: {
  accesses: AuthAccess[];
  sessionToken: string;
}) {
  const [state, formAction] = useActionState(selectAccessAction, initialState);

  return (
    <form action={formAction} className="selector-card">
      <input type="hidden" name="token" value={sessionToken} />

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
              <strong>{access.role.replaceAll("_", " ")}</strong>
              <p>{describeAccess(access)}</p>
              <div className="pill-row">
                <span className="pill">{access.scopeType}</span>
                {access.city ? <span className="pill">{access.city.slug}</span> : null}
                {access.business ? <span className="pill">{access.business.slug}</span> : null}
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
