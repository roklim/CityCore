import Link from "next/link";
import { notFound } from "next/navigation";
import { MODULE_DEFINITIONS } from "@platform/templates";
import { PublicShell } from "../../../components/public-shell";
import {
  getPublicBusinessSurfaceData,
  getPublicOrderingMenuPreview,
} from "../../../lib/public-runtime";
import { OrderingOrderPanel } from "./ordering-order-panel";

type BusinessPageProps = {
  params: Promise<{ citySlug: string; businessSlug: string }>;
};

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { citySlug, businessSlug } = await params;
  const surface = await getPublicBusinessSurfaceData(citySlug, businessSlug);

  if (!surface) {
    notFound();
  }

  const { business, city, degraded } = surface;
  const module = MODULE_DEFINITIONS.find((item) => item.code === business.moduleCode);
  const orderingPreview =
    business.moduleCode === "ordering"
      ? await getPublicOrderingMenuPreview(citySlug, businessSlug)
      : null;

  return (
    <PublicShell
      toneLabel="Scheda attivita"
      title={business.heroTitle}
      description={business.heroDescription}
      citySlug={city.slug}
      businessName={business.name}
      accentNote={`${business.trustLine} La CTA principale resta visibile presto e tutto il resto la sostiene, non la copre.`}
    >
      <section className="public-stack">
        {degraded ? (
          <section className="spotlight-card">
            <p className="section-label">Scheda in sincronizzazione</p>
            <h2>Il layout pubblico resta leggibile anche se i dati live non sono completi.</h2>
            <p>
              La pagina continua a usare la stessa gerarchia finale, ma alcuni dettagli possono
              arrivare temporaneamente dal fallback editoriale.
            </p>
          </section>
        ) : null}

        <section className="business-hero-grid">
          <article className="spotlight-card spotlight-primary">
            <div className="card-topline">
              <span className="pill">{business.categoryLabel}</span>
              <span className="pill">{business.priceHint}</span>
              <span className="pill">{business.openNowLabel}</span>
            </div>

            <h2>{business.name}</h2>
            <p>{business.summary}</p>

            <div className="cta-row">
              <a className="cta-button" href={business.primaryAction.href}>
                {business.primaryAction.label}
              </a>
              <a className="text-link" href={business.secondaryAction.href}>
                {business.secondaryAction.label}
              </a>
            </div>
          </article>

          <article className="spotlight-card">
            <p className="section-label">Decisione rapida</p>
            <h2>Le info che servono prima di tutto</h2>
            <dl className="mini-facts compact">
              <div>
                <dt>Zona</dt>
                <dd>{business.area}</dd>
              </div>
              <div>
                <dt>Contesto</dt>
                <dd>{city.name}</dd>
              </div>
              <div>
                <dt>Risposta</dt>
                <dd>{business.eta}</dd>
              </div>
            </dl>
          </article>
        </section>

        <section className="section-header" id="primary-action">
          <p className="section-label">Modulo attivo</p>
          <h2>
            {business.moduleLabel ?? module?.label ?? business.moduleCode} come centro della pagina
          </h2>
          <p>
            La CTA principale non vive in un box secondario: sta al centro del percorso e chiarisce
            subito il passo successivo.
          </p>
        </section>

        <section className="public-feature-grid">
          <article className="spotlight-card">
            <p className="section-label">Perche scegliere questa attivita</p>
            <div className="pill-row">
              {business.highlights.map((item) => (
                <span className="pill" key={item}>
                  {item}
                </span>
              ))}
            </div>
            <p>{business.vibe}</p>
          </article>

          <article className="spotlight-card">
            <p className="section-label">Momenti giusti</p>
            <ul className="detail-list">
              {business.serviceMoments.map((moment) => (
                <li key={moment}>{moment}</li>
              ))}
            </ul>
          </article>
        </section>

        {business.moduleCode === "ordering" ? (
          <>
            <section className="section-header">
              <p className="section-label">Preview menu</p>
              <h2>
                {orderingPreview?.live
                  ? "Il menu pubblico arriva gia dalla V2"
                  : "La struttura menu e pronta ad agganciarsi ai dati live"}
              </h2>
              <p>
                La migrazione del verticale ordering parte dal catalogo: categorie e proposte
                leggibili, pronte a vivere fuori dalla V1.
              </p>
            </section>

            <section className="public-list-grid">
              {orderingPreview && orderingPreview.categories.length > 0 ? (
                orderingPreview.categories.map((category) => (
                  <article className="public-card" key={category.id}>
                    <div className="card-copy">
                      <h3>{category.name}</h3>
                      <p>
                        {category.items.length} proposte visibili gia esposte dalla nuova API
                        ordering.
                      </p>
                    </div>

                    <ul className="detail-list">
                      {category.items.map((item) => (
                        <li key={item.id}>
                          <strong>{item.emoji ? `${item.emoji} ${item.name}` : item.name}</strong>
                          {item.price != null ? ` - EUR ${item.price.toFixed(2)}` : ""}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))
              ) : (
                <article className="spotlight-card">
                  <p className="section-label">Catalogo in costruzione</p>
                  <h3>Il business usa ordering, ma il menu V2 non e ancora popolato.</h3>
                  <p>
                    Il punto importante e che la surface pubblica non dipende piu dalla route menu
                    legacy per iniziare la migrazione.
                  </p>
                </article>
              )}
            </section>

            <OrderingOrderPanel
              businessName={business.name}
              businessSlug={businessSlug}
              categories={orderingPreview?.categories ?? []}
              citySlug={citySlug}
              settings={
                orderingPreview?.settings ?? {
                  openingHours: null,
                  openingDays: [],
                  openingTimeStart: null,
                  openingTimeEnd: null,
                  deliveryCost: 0,
                  minimumOrder: 0,
                  slotMinutes: 15,
                  maxOrdersPerSlot: 4,
                  minPreparationMinutes: 30,
                  closedDates: [],
                  specialDates: [],
                  serviceZones: [],
                  customerMessage: null,
                }
              }
            />
          </>
        ) : null}

        <section className="split-callout">
          <div className="split-callout-copy">
            <p className="section-label">Informazioni pratiche</p>
            <h2>Dove si trova, come contattarla, cosa aspettarti</h2>
            <p>
              {business.addressLine}. Contatto principale {business.secondaryAction.label}. La
              pagina mette questi dati prima del rumore e li rende leggibili in un solo scroll.
            </p>
          </div>

          <div className="split-callout-actions">
            <a className="cta-button" href={business.secondaryAction.href}>
              {business.secondaryAction.label}
            </a>
            <Link className="text-link" href={`/${city.slug}`}>
              Torna a {city.name}
            </Link>
          </div>
        </section>

        <section className="section-header">
          <p className="section-label">FAQ</p>
          <h2>Risposte veloci, senza costringere l'utente a cercare altrove</h2>
        </section>

        <section className="public-list-grid">
          {business.faq.map((entry) => (
            <article className="public-card" key={entry.question}>
              <div className="card-copy">
                <h3>{entry.question}</h3>
                <p>{entry.answer}</p>
              </div>
            </article>
          ))}
        </section>
      </section>
    </PublicShell>
  );
}
