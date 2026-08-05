import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "../../../components/public-shell";
import { PublicInquiryForm } from "../../../components/public-business/public-inquiry-form";
import { buildBusinessPageContent } from "../../../lib/public-content";
import { getPublicBusinessSurfaceData } from "../../../lib/public-runtime";

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
  const copy = buildBusinessPageContent(business, city.name, business.moduleLabel);

  return (
    <PublicShell
      toneLabel={copy.toneLabel}
      title={business.heroTitle}
      description={business.heroDescription}
      citySlug={city.slug}
      businessName={business.name}
      accentNote={copy.accentNote}
    >
      <section className="public-stack">
        {degraded ? (
          <section className="spotlight-card">
            <p className="section-label">{copy.syncingLabel}</p>
            <h2>{copy.syncingTitle}</h2>
            <p>{copy.syncingBody}</p>
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
            <p className="section-label">{copy.quickDecision}</p>
            <h2>{copy.quickDecisionTitle}</h2>
            <dl className="mini-facts compact">
              <div>
                <dt>{copy.area}</dt>
                <dd>{business.area}</dd>
              </div>
              <div>
                <dt>{copy.context}</dt>
                <dd>{city.name}</dd>
              </div>
              <div>
                <dt>{copy.response}</dt>
                <dd>{business.eta}</dd>
              </div>
            </dl>
          </article>
        </section>

        <section className="section-header" id="primary-action">
          <p className="section-label">{copy.activeModule}</p>
          <h2>{copy.activeModuleTitle}</h2>
          <p>{copy.activeModuleBody}</p>
        </section>

        <section className="public-feature-grid">
          <article className="spotlight-card">
            <p className="section-label">{copy.chooseWhy}</p>
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
            <p className="section-label">{copy.rightMoments}</p>
            <ul className="detail-list">
              {business.serviceMoments.map((moment) => (
                <li key={moment}>{moment}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="split-callout">
          <div className="split-callout-copy">
            <p className="section-label">{copy.publicShape}</p>
            <h2>{copy.publicShapeTitle}</h2>
            <p>{copy.publicShapeBody}</p>
          </div>

          <div className="split-callout-actions">
            <a className="cta-button" href={business.primaryAction.href}>
              {business.primaryAction.label}
            </a>
            <a className="text-link" href={business.secondaryAction.href}>
              {business.secondaryAction.label}
            </a>
          </div>
        </section>

        <section className="split-callout">
          <div className="split-callout-copy">
            <p className="section-label">{copy.practicalInfo}</p>
            <h2>{copy.practicalTitle}</h2>
            <p>{copy.practicalBody}</p>
          </div>

          <div className="split-callout-actions">
            <a className="cta-button" href={business.secondaryAction.href}>
              {business.secondaryAction.label}
            </a>
            <Link className="text-link" href={`/${city.slug}`}>
              {copy.backToCity}
            </Link>
          </div>
        </section>

        {degraded ? (
          <section className="spotlight-card" aria-live="polite">
            <p>
              Le richieste non sono disponibili mentre vengono visualizzati contenuti dimostrativi.
            </p>
          </section>
        ) : (
          <PublicInquiryForm citySlug={city.slug} businessSlug={business.slug} />
        )}

        <section className="section-header">
          <p className="section-label">{copy.faq}</p>
          <h2>{copy.faqTitle}</h2>
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
