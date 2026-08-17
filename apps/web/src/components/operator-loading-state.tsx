export function OperatorLoadingState({ label = "Area operatori" }: { label?: string }) {
  return (
    <div className="operator-state-stage" aria-busy="true" aria-live="polite">
      <header className="operator-state-topbar">
        <div className="operator-state-brand">
          CityCore<span aria-hidden="true">.</span>
        </div>
        <span>{label}</span>
      </header>
      <div className="operator-state-layout">
        <aside className="operator-state-rail" aria-hidden="true">
          <span className="operator-skeleton operator-skeleton-label" />
          <span className="operator-skeleton operator-skeleton-nav" />
          <span className="operator-skeleton operator-skeleton-nav" />
          <span className="operator-skeleton operator-skeleton-nav short" />
        </aside>
        <main className="operator-state-main" id="main-content" tabIndex={-1}>
          <span className="operator-skeleton operator-skeleton-kicker" />
          <span className="operator-skeleton operator-skeleton-title" />
          <span className="operator-skeleton operator-skeleton-copy" />
          <div className="operator-state-card-grid" aria-hidden="true">
            <span className="operator-skeleton operator-skeleton-card" />
            <span className="operator-skeleton operator-skeleton-card" />
            <span className="operator-skeleton operator-skeleton-card" />
          </div>
          <p className="operator-state-loading-copy">Caricamento workspace…</p>
        </main>
      </div>
    </div>
  );
}
