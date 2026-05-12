import Link from "next/link";
import { notFound } from "next/navigation";
import { MODULE_DEFINITIONS } from "@platform/templates";
import { PublicShell } from "../../components/public-shell";
import { getPublicCitySurfaceData } from "../../lib/public-runtime";

type CityPageProps = {
  params: Promise<{ citySlug: string }>;
};

export default async function CityPage({ params }: CityPageProps) {
  const { citySlug } = await params;
  const surface = await getPublicCitySurfaceData(citySlug);

  if (!surface) {
    notFound();
  }

  const { city, degraded } = surface;

  return (
    <PublicShell
      toneLabel="Marketplace di citta"
      title={`${city.name}: attivita locali facili da trovare e ancora piu facili da scegliere.`}
      description={city.shortPitch}
      citySlug={city.slug}
      accentNote={`${city.claim} Il focus non e riempire la pagina di box, ma guidare l'utente verso il business giusto.`}
    >
      <section className="public-stack">
        {degraded ? (
          <section className="spotlight-card">
            <p className="section-label">Aggiornamento catalogo</p>
            <h2>La pagina citta resta navigabile mentre i dati live si riallineano.</h2>
            <p>
              La struttura mobile-first rimane coerente, ma una parte dei contenuti puo arrivare
              temporaneamente da fallback editoriali.
            </p>
          </section>
        ) : null}

        <section className="public-feature-grid">
          <article className="spotlight-card spotlight-primary">
            <p className="section-label">Vista rapida</p>
            <h2>Le categorie che contano di piu qui</h2>
            <p>
              In mobile devono essere subito leggibili: attivita, richieste, prenotazioni, soggiorni
              o servizi locali, senza costringere l'utente a interpretare troppo.
            </p>

            <div className="pill-row">
              {city.quickFilters.map((code) => {
                const module = MODULE_DEFINITIONS.find((item) => item.code === code);

                return (
                  <span className="pill" key={code}>
                    {module?.label ?? code}
                  </span>
                );
              })}
            </div>
          </article>

          <article className="spotlight-card">
            <p className="section-label">Quartieri</p>
            <h2>Contesto locale, non catalogo astratto</h2>
            <p>
              La pagina citta deve dare orientamento: centro, quartieri chiave, segnali utili per
              capire dove conviene guardare prima.
            </p>

            <div className="city-ribbon">
              {city.neighborhoods.map((item) => (
                <span className="city-ribbon-chip" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </article>
        </section>

        <section className="section-header">
          <p className="section-label">In evidenza</p>
          <h2>
            {city.businessCount > 0
              ? `${city.businessCount} attivita pubbliche gia leggibili dalla V2`
              : "Una pagina citta pronta ad accogliere le prime attivita attive"}
          </h2>
          <p>
            Ogni scheda deve comunicare identita, contesto e promessa operativa in pochi secondi,
            soprattutto da telefono.
          </p>
        </section>

        <section className="public-list-grid">
          {city.businesses.length > 0 ? (
            city.businesses.map((business) => (
              <article className="public-card" key={business.slug}>
                <div className="card-topline">
                  <span className="pill">{business.categoryLabel}</span>
                  <span className="pill">{business.priceHint}</span>
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
                    <dt>Stato</dt>
                    <dd>{business.openNowLabel}</dd>
                  </div>
                </dl>

                <p className="trust-copy">{business.trustLine}</p>

                <div className="card-actions">
                  <Link className="text-link" href={business.contactHref}>
                    {business.contactLabel}
                  </Link>
                  <Link className="cta-button secondary" href={business.href}>
                    Apri attivita
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <article className="spotlight-card spotlight-primary">
              <p className="section-label">Nessuna attivita attiva</p>
              <h3>La citta e gia pronta, il catalogo pubblico si sta popolando.</h3>
              <p>
                La surface V2 gestisce correttamente anche la fase iniziale: citta visibile,
                contesto chiaro e spazio per accogliere i primi business senza ricadere nella V1.
              </p>
            </article>
          )}
        </section>

        <section className="public-feature-grid">
          <article className="spotlight-card">
            <p className="section-label">Piu richiesti</p>
            <h2>Le azioni che devono essere immediate</h2>
            <ul className="detail-list">
              <li>
                <strong>Ordina o prenota.</strong> La CTA primaria deve stare sopra la piega.
              </li>
              <li>
                <strong>Capisci tempi e zona.</strong> Prima dei dettagli lunghi.
              </li>
              <li>
                <strong>Confronta 2-3 opzioni.</strong> Non venti senza gerarchia.
              </li>
            </ul>
          </article>

          <article className="spotlight-card">
            <p className="section-label">Nuove aperture</p>
            <h2>Una pagina pronta a crescere senza diventare rumorosa</h2>
            <p>
              La griglia puo ospitare nuovi business, ma la struttura resta pulita: card chiare,
              filtri semplici e nessuna sidebar inutile su mobile.
            </p>
          </article>
        </section>
      </section>
    </PublicShell>
  );
}
