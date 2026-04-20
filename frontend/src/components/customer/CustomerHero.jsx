export default function CustomerHero({
  counterOpen,
  heroCopy,
  openingHours,
  publicMessage,
  serviceHighlights,
}) {
  return (
    <section className="brand-panel">
      <p className="eyebrow">{heroCopy.eyebrow}</p>
      <h1>{heroCopy.title}</h1>
      <p className="lead">{heroCopy.subtitle}</p>
      <div className={`opening-hours-card ${counterOpen ? "open" : "closed"}`}>
        <span className="opening-status-pill">
          {counterOpen ? "Aperto ora" : "Chiuso ora"}
        </span>
        <span className="opening-label">Orari di apertura</span>
        <strong>{openingHours}</strong>
        {publicMessage && <p>{publicMessage}</p>}
      </div>
      <div className="hero-actions">
        <button
          type="button"
          onClick={() =>
            document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" })
          }
        >
          Ordina ora -&gt;
        </button>
        <button
          type="button"
          onClick={() =>
            document
              .getElementById("recover-order")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          Recupera il tuo ordine
        </button>
      </div>
      <div className="service-strip" aria-label="Riepilogo servizio">
        {serviceHighlights.map(([label, value]) => (
          <span key={label}>
            <strong>{label}</strong> {value}
          </span>
        ))}
      </div>
    </section>
  );
}
