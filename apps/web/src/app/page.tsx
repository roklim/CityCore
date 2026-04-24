const surfaces = [
  {
    href: "/admin",
    title: "Global Admin",
    description:
      "Shell piattaforma per governance, citta, business, utenti, audit e onboarding.",
  },
  {
    href: "/demo-city",
    title: "Marketplace Citta",
    description:
      "Directory city-first per attivita, moduli, ranking e discovery locale.",
  },
  {
    href: "/demo-city/demo-business",
    title: "Business Page",
    description:
      "Pagina pubblica template-driven del business con CTA e modulo attivo.",
  },
  {
    href: "/account",
    title: "Customer Area",
    description:
      "Area utente per ordini, prenotazioni, soggiorni e preferenze future.",
  },
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Platform V2</p>
        <h1>Foundation del nuovo platform layer.</h1>
        <p>
          Questo cantiere avvia la V2 con Next.js App Router come web layer,
          superfici separate per piattaforma, citta, business e account, e
          spazio per i moduli ordering, appointments, stays e mobility request.
        </p>
        <div className="pill-row">
          <span className="pill">Next.js 16</span>
          <span className="pill">React 19</span>
          <span className="pill">TypeScript</span>
          <span className="pill">App Router</span>
          <span className="pill">City-first</span>
        </div>
      </section>

      <div className="grid">
        <article className="card">
          <strong>Stack scelto</strong>
          <p>
            Web su Next.js, API separata, worker dedicato, Postgres come core,
            Redis per queue e cache, template engine e AI onboarding.
          </p>
        </article>
        <article className="card">
          <strong>Principio guida</strong>
          <p>
            Non piu una pizzeria estesa, ma una piattaforma locale multi-citta
            a moduli e template, pronta a crescere senza rifare il core.
          </p>
        </article>
        <article className="card">
          <strong>Legacy protetta</strong>
          <p>
            La V2 parte in parallelo alla codebase attuale. Possiamo costruire,
            migrare e validare senza rompere il prodotto esistente.
          </p>
        </article>
      </div>

      <section className="link-grid">
        {surfaces.map((surface) => (
          <a className="link-card" href={surface.href} key={surface.href}>
            <strong>{surface.title}</strong>
            <span>{surface.description}</span>
          </a>
        ))}
      </section>
    </main>
  );
}
