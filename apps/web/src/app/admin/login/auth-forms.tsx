"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { bootstrapAdminAction, loginAction, type AdminAuthActionState } from "../actions";

const initialState: AdminAuthActionState = {
  error: null,
};

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="form-button" type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
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

export function AdminLoginForms() {
  const [bootstrapState, bootstrapFormAction] = useActionState(bootstrapAdminAction, initialState);
  const [loginState, loginFormAction] = useActionState(loginAction, initialState);
  const [loginEmail, setLoginEmail] = useState("");
  const [bootstrapName, setBootstrapName] = useState("");
  const [bootstrapEmail, setBootstrapEmail] = useState("");

  return (
    <div className="auth-grid">
      <section className="auth-card">
        <div className="auth-card-copy">
          <p className="section-label">Login</p>
          <h2>Accedi alla console</h2>
          <p>
            La sessione web viene salvata in un cookie <code>httpOnly</code> gestito da Next.
            L'accesso resta dentro la piattaforma attiva.
          </p>
        </div>

        <form action={loginFormAction} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setLoginEmail(event.target.value)}
              type="email"
              placeholder="admin@platform.dev"
              required
              value={loginEmail}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              type="password"
              placeholder="La tua password"
              required
            />
          </label>

          <ErrorBanner state={loginState} />
          <SubmitButton label="Accedi" pendingLabel="Accesso in corso..." />
        </form>
      </section>

      <section className="auth-card">
        <div className="auth-card-copy">
          <p className="section-label">Bootstrap</p>
          <h2>Primo global admin</h2>
          <p>
            Usa questa sezione solo al primo avvio della piattaforma, quando non esiste ancora
            nessun <code>global_admin</code> salvato in Postgres.
          </p>
        </div>

        <form action={bootstrapFormAction} className="auth-form">
          <label className="field">
            <span>Nome</span>
            <input
              autoComplete="name"
              name="name"
              onChange={(event) => setBootstrapName(event.target.value)}
              placeholder="Platform Owner"
              type="text"
              value={bootstrapName}
            />
          </label>

          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setBootstrapEmail(event.target.value)}
              type="email"
              placeholder="owner@platform.dev"
              required
              value={bootstrapEmail}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete="new-password"
              minLength={8}
              name="password"
              type="password"
              placeholder="Minimo 8 caratteri"
              required
            />
          </label>

          <ErrorBanner state={bootstrapState} />
          <SubmitButton label="Crea admin" pendingLabel="Creazione in corso..." />
        </form>
      </section>
    </div>
  );
}
