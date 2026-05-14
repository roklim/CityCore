import Link from "next/link";
import { notFound } from "next/navigation";
import { MODULE_DEFINITIONS } from "@platform/templates";
import { PublicShell } from "../../components/public-shell";
import { buildCityPageContent } from "../../lib/public-content";
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
  const copy = buildCityPageContent(city);

  return (
    <PublicShell
      toneLabel={copy.toneLabel}
      title={copy.title}
      description={city.shortPitch}
      citySlug={city.slug}
      accentNote={copy.accentNote}
    >
      <section className="public-stack">
        {degraded ? (
          <section className="spotlight-card">
            <p className="section-label">{copy.degradedLabel}</p>
            <h2>{copy.degradedTitle}</h2>
            <p>{copy.degradedBody}</p>
          </section>
        ) : null}

        <section className="public-feature-grid">
          <article className="spotlight-card spotlight-primary">
            <p className="section-label">{copy.quickView}</p>
            <h2>{copy.quickTitle}</h2>
            <p>{copy.quickBody}</p>

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
            <p className="section-label">{copy.neighborhoodsLabel}</p>
            <h2>{copy.neighborhoodsTitle}</h2>
            <p>{copy.neighborhoodsBody}</p>

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
          <p className="section-label">{copy.featuredLabel}</p>
          <h2>{copy.featuredTitle}</h2>
          <p>{copy.featuredBody}</p>
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
                    <dt>{copy.zone}</dt>
                    <dd>{business.area}</dd>
                  </div>
                  <div>
                    <dt>{copy.time}</dt>
                    <dd>{business.eta}</dd>
                  </div>
                  <div>
                    <dt>{copy.status}</dt>
                    <dd>{business.openNowLabel}</dd>
                  </div>
                </dl>

                <p className="trust-copy">{business.trustLine}</p>

                <div className="card-actions">
                  <Link className="text-link" href={business.contactHref}>
                    {business.contactLabel}
                  </Link>
                  <Link className="cta-button secondary" href={business.href}>
                    {copy.openBusiness}
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <article className="spotlight-card spotlight-primary">
              <p className="section-label">{copy.noBusinessesLabel}</p>
              <h3>{copy.noBusinessesTitle}</h3>
              <p>{copy.noBusinessesBody}</p>
            </article>
          )}
        </section>

        <section className="public-feature-grid">
          <article className="spotlight-card">
            <p className="section-label">{copy.requestedLabel}</p>
            <h2>{copy.requestedTitle}</h2>
            <ul className="detail-list">
              {copy.actionRules.map((rule) => (
                <li key={rule.title}>
                  <strong>{rule.title}</strong> {rule.body}
                </li>
              ))}
            </ul>
          </article>

          <article className="spotlight-card">
            <p className="section-label">{copy.openingLabel}</p>
            <h2>{copy.openingTitle}</h2>
            <p>{copy.openingBody}</p>
          </article>
        </section>
      </section>
    </PublicShell>
  );
}
