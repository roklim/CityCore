import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[app] Render failed", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="app-error-shell">
        <section className="app-error-card">
          <p className="eyebrow">Applicazione non caricata</p>
          <h1>Qualcosa non ha risposto correttamente.</h1>
          <p>
            Aggiorna la pagina. Se il problema continua, controlla che il
            deploy piu recente sia pubblicato.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Ricarica pagina
          </button>
        </section>
      </main>
    );
  }
}
