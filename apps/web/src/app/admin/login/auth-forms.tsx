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

export function AdminLoginForms({
  bootstrapStatus,
}: {
  bootstrapStatus: {
    required: boolean;
    available: boolean;
    secretRequired?: boolean;
  } | null;
}) {
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
          <p>Inserisci le credenziali ricevute per gestire le aree a cui sei autorizzato.</p>
        </div>

        <form action={loginFormAction} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setLoginEmail(event.target.value)}
              type="email"
              placeholder="nome@esempio.it"
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
          <small className="muted-copy">
            Password dimenticata? Un amministratore autorizzato può generarne una temporanea dalla
            sezione Accessi.
          </small>
        </form>
      </section>

      {bootstrapStatus?.required && bootstrapStatus.available ? (
        <section className="auth-card">
          <div className="auth-card-copy">
            <p className="section-label">Prima configurazione</p>
            <h2>Crea il primo amministratore</h2>
            <p>
              Questa operazione compare solo al primo avvio e crea l&apos;account che gestirà la
              piattaforma.
            </p>
          </div>

          <form action={bootstrapFormAction} className="auth-form">
            <label className="field">
              <span>Nome</span>
              <input
                autoComplete="name"
                name="name"
                onChange={(event) => setBootstrapName(event.target.value)}
                placeholder="Nome e cognome"
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
                placeholder="nome@esempio.it"
                required
                value={bootstrapEmail}
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                autoComplete="new-password"
                minLength={12}
                name="password"
                type="password"
                placeholder="Minimo 12 caratteri"
                required
              />
            </label>

            {bootstrapStatus.secretRequired ? (
              <label className="field">
                <span>Codice di configurazione</span>
                <input
                  autoComplete="off"
                  minLength={16}
                  name="bootstrapSecret"
                  type="password"
                  required
                />
                <small>Usa il codice configurato dal responsabile del deploy.</small>
              </label>
            ) : null}

            <ErrorBanner state={bootstrapState} />
            <SubmitButton label="Crea admin" pendingLabel="Creazione in corso..." />
          </form>
        </section>
      ) : bootstrapStatus?.required ? (
        <section className="auth-card">
          <div className="auth-card-copy">
            <p className="section-label">Prima configurazione</p>
            <h2>Configurazione non ancora abilitata</h2>
            <p>
              Imposta il codice sicuro previsto nella configurazione del server, quindi ricarica
              questa pagina. In alternativa crea il primo amministratore con lo strumento operativo
              del progetto.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
