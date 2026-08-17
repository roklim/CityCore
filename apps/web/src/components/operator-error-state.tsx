"use client";

import Link from "next/link";

export function OperatorErrorState({
  reset,
  title = "Non siamo riusciti ad aprire questa area",
  body = "I tuoi dati e permessi non sono stati modificati. Riprova oppure torna alla dashboard.",
}: {
  reset: () => void;
  title?: string;
  body?: string;
}) {
  return (
    <div className="operator-error-stage">
      <header className="operator-state-topbar">
        <Link className="operator-state-brand" href="/admin">
          CityCore<span aria-hidden="true">.</span>
        </Link>
        <span>Operator workspace</span>
      </header>
      <main className="operator-error-panel" id="main-content" tabIndex={-1}>
        <span className="operator-error-code" aria-hidden="true">
          !
        </span>
        <p className="section-label">Errore temporaneo</p>
        <h1>{title}</h1>
        <p>{body}</p>
        <div className="operator-error-actions">
          <button className="admin-button form-button" onClick={reset} type="button">
            Riprova
          </button>
          <Link className="admin-button ghost-button" href="/admin">
            Torna alla dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
