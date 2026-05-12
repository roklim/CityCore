import Link from "next/link";
import { MODULE_DEFINITIONS } from "@platform/templates";
import { PublicShell } from "../components/public-shell";
import { getHomepageSurfaceData } from "../lib/public-runtime";

const journeySteps = [
  {
    title: "Scegli la citta",
    description:
      "Parti dal contesto locale, non da un elenco infinito. La piattaforma ti porta subito dove ha senso cercare.",
  },
  {
    title: "Confronta attivita vere",
    description:
      "Ogni scheda mette in evidenza il modulo giusto: ordinare, prenotare, chiedere disponibilita o contattare.",
  },
  {
    title: "Passa all'azione in pochi tap",
    description:
      "CTA chiare, informazioni pratiche e struttura mobile-first aiutano a decidere senza frizione.",
  },
] as const;

export default async function HomePage() {
  const { degraded, featuredCities, showcaseBusinesses, liveBusinesses, liveCities } =
    await getHomepageSurfaceData();
  const priorityModules = MODULE_DEFINITIONS.slice(0, 4);

  return (
    <PublicShell
      toneLabel="Marketplace locale"
      title="Trova l'attivita giusta nella tua citta, poi passa subito all'azione."
      description="La V2 non vuole essere una directory rumorosa: vuole aiutarti a trovare attivita locali, capire subito cosa offrono e compiere un'azione semplice da telefono."
      accentNote="Qui la priorita non e mostrare tutto, ma mostrare bene cio che conta: citta, attivita, CTA e informazioni pratiche."
    >
      <section className="public-stack">
        {degraded ? (
          <section className="spotlight-card">
            <p className="section-label">Catalogo in riallineamento</p>
            <h2>La struttura pubblica resta consultabile mentre i dati live si riagganciano.</h2>
            <p>
              Le schede mantengono il tono finale di prodotto, ma alcuni dettagli potrebbero
              arrivare da un fallback editoriale finche la surface pubblica V2 non risponde.
            </p>
          </section>
        ) : null}

        <div className="public-feature-grid">
          <article className="spotlight-card spotlight-primary">
            <p className="section-label">Ingresso rapido</p>
            <h2>
              {liveCities ? "Citta attive da cui partire adesso" : "Citta da cui partire adesso"}
            </h2>
            <p>
              Scegli una citta gia esposta dalla V2 e entra direttamente in un marketplace che parla
              il linguaggio dell'utente finale.
            </p>

            <div className="cta-row">
              {featuredCities.map((city) => (
                <Link className="cta-button" href={city.href} key={city.slug}>
                  {city.name}
                </Link>
              ))}
            </div>
          </article>

          <article className="spotlight-card">
            <p className="section-label">Per chi cerca</p>
            <h2>Scoperta semplice, scelta chiara</h2>
            <p>
              Nessuna landing astratta: la homepage deve farti capire subito se cercare un'attivita,
              inviare una richiesta, prenotare o contattare un servizio locale.
            </p>

            <div className="pill-row">
              {priorityModules.map((module) => (
                <span className="pill" key={module.code}>
                  {module.label}
                </span>
              ))}
            </div>
          </article>
        </div>

        <section className="section-header">
          <p className="section-label">In evidenza</p>
          <h2>
            {liveBusinesses
              ? "Attivita live che si capiscono al volo"
              : "Attivita che si capiscono al volo"}
          </h2>
          <p>
            Ogni card deve dire subito cosa offre, in che contesto si trova e quale azione ha piu
            senso fare.
          </p>
        </section>

        <section className="public-list-grid">
          {showcaseBusinesses.map((business) => (
            <article className="public-card" key={`${business.citySlug}-${business.slug}`}>
              <div className="card-topline">
                <span className="pill">{business.cityName}</span>
                <span className="pill">{business.categoryLabel}</span>
              </div>

              <div className="card-copy">
                <h3>{business.name}</h3>
                <p>{business.summary}</p>
              </div>

              <dl className="mini-facts">
                <div>
                  <dt>Zona</dt>
                  <dd>{business.area}</dd>
                </div>
                <div>
                  <dt>Tempo</dt>
                  <dd>{business.eta}</dd>
                </div>
                <div>
                  <dt>Taglio</dt>
                  <dd>{business.vibe}</dd>
                </div>
              </dl>

              <div className="card-actions">
                <Link className="text-link" href={business.cityHref}>
                  Vai alla citta
                </Link>
                <Link className="cta-button secondary" href={business.href}>
                  Apri la scheda
                </Link>
              </div>
            </article>
          ))}
        </section>

        <section className="section-header">
          <p className="section-label">Come funziona</p>
          <h2>Una struttura che aiuta, non che distrae</h2>
        </section>

        <section className="public-feature-grid">
          {journeySteps.map((step, index) => (
            <article className="spotlight-card" key={step.title}>
              <span className="numeric-badge">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </section>

        <section className="split-callout">
          <div className="split-callout-copy">
            <p className="section-label">Per i partner</p>
            <h2>Anche il lato business smette di sembrare un pannello improvvisato</h2>
            <p>
              La stessa V2 che migliora la scoperta lato utente prepara strumenti piu chiari per chi
              deve gestire citta, attivita e flussi reali da mobile.
            </p>
          </div>

          <div className="split-callout-actions">
            <Link className="cta-button" href="/admin/login">
              Apri area partner
            </Link>
            <Link className="text-link" href="/cagli">
              Esplora una citta demo
            </Link>
          </div>
        </section>
      </section>
    </PublicShell>
  );
}
