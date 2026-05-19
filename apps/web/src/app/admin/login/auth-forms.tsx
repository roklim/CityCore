"use client";

import { useActionState } from "react";
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
  if (!state.error) {
    return null;
  }

  return <p className="form-error">{state.error}</p>;
}

export function AdminLoginForms() {
  const [bootstrapState, bootstrapFormAction] = useActionState(bootstrapAdminAction, initialState);
  const [loginState, loginFormAction] = useActionState(loginAction, initialState);

  return (
    <div className="auth-grid">
      <section className="auth-card">
        <div className="auth-card-copy">
          <p className="section-label">Bootstrap</p>
          <h2>Primo global admin</h2>
          <p>
            Usa questa sezione solo al primo avvio della piattaforma, quando non esiste ancora
            nessun `global_admin` salvato in Postgres.
          </p>
        </div>

        <form action={bootstrapFormAction} className="auth-form">
          <label className="field">
            <span>Nome</span>
            <input name="name" type="text" placeholder="Platform Owner" autoComplete="name" />
          </label>

          <label className="field">
            <span>Email</span>
            <input name="email" type="email" placeholder="owner@platform.dev" required />
          </label>

          <label className="field">
            <span>Password</span>
            <input name="password" type="password" placeholder="Minimo 8 caratteri" required />
          </label>

          <ErrorBanner state={bootstrapState} />
          <SubmitButton label="Crea admin" pendingLabel="Creazione in corso..." />
        </form>
      </section>

      <section className="auth-card">
        <div className="auth-card-copy">
          <p className="section-label">Login</p>
          <h2>Accedi alla console</h2>
          <p>
            La sessione web viene salvata in un cookie `httpOnly` gestito da Next. L'accesso resta
            tutto dentro la piattaforma attiva.
          </p>
        </div>

        <form action={loginFormAction} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" placeholder="admin@platform.dev" required />
          </label>

          <label className="field">
            <span>Password</span>
            <input name="password" type="password" placeholder="La tua password" required />
          </label>

          <ErrorBanner state={loginState} />
          <SubmitButton label="Accedi" pendingLabel="Accesso in corso..." />
        </form>
      </section>
    </div>
  );
}
