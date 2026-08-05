import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicShell } from "../../../components/public-shell";
import { PublicInquiryForm } from "../../../components/public-business/public-inquiry-form";
import { PublicPickupOrderForm } from "../../../components/public-business/public-pickup-order-form";
import { buildBusinessPageContent } from "../../../lib/public-content";
import { getPublicBusinessSurfaceData } from "../../../lib/public-runtime";
import {
  getPublicBusinessOpeningHours,
  getPublicPickupOrderMenu,
  getPublicBusinessServices,
} from "../../../lib/public-runtime";
import {
  formatOpeningDay,
  formatServiceDuration,
  getCurrentWeekdayInTimezone,
  getBusinessOpeningStatus,
  sortPublicBusinessServices,
  weekdays,
} from "../../../lib/business-opening-hours";
import { normalizeExternalUrl, normalizePhoneHref } from "../../../lib/public-links";

type BusinessPageProps = {
  params: Promise<{ citySlug: string; businessSlug: string }>;
};

export async function generateMetadata({ params }: BusinessPageProps): Promise<Metadata> {
  const { citySlug, businessSlug } = await params;
  const surface = await getPublicBusinessSurfaceData(citySlug, businessSlug);

  if (!surface) {
    return { title: "Attività non trovata" };
  }

  if (surface.degraded) {
    return { title: "Contenuti dimostrativi" };
  }

  return {
    title: surface.business.heroTitle || surface.business.name,
    description: surface.business.summary,
  };
}

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { citySlug, businessSlug } = await params;
  const surface = await getPublicBusinessSurfaceData(citySlug, businessSlug);

  if (!surface) {
    notFound();
  }

  const { business, city, degraded } = surface;
  const [servicesResult, openingHoursResult, pickupOrderMenuResult] = degraded
    ? [null, null, null]
    : await Promise.allSettled([
        getPublicBusinessServices(city.slug, business.slug),
        getPublicBusinessOpeningHours(city.slug, business.slug),
        getPublicPickupOrderMenu(city.slug, business.slug),
      ]);
  const services =
    servicesResult?.status === "fulfilled"
      ? sortPublicBusinessServices(servicesResult.value.items)
      : [];
  const openingDays =
    openingHoursResult?.status === "fulfilled" ? openingHoursResult.value.items : [];
  const openingStatus =
    openingHoursResult?.status === "fulfilled"
      ? getBusinessOpeningStatus(openingDays, openingHoursResult.value.timezone)
      : null;
  const pickupOrderMenu =
    pickupOrderMenuResult?.status === "fulfilled" && pickupOrderMenuResult.value.items.length
      ? pickupOrderMenuResult.value
      : null;
  const phoneHref = normalizePhoneHref(business.contactPhone);
  const website = normalizeExternalUrl(business.website);
  const emailHref = business.publicEmail ? `mailto:${business.publicEmail}` : null;
  const primaryAction = degraded
    ? business.primaryAction
    : pickupOrderMenu
      ? { label: "Ordina e ritira", href: "#order" }
      : { label: "Invia una richiesta", href: "#contact" };
  const locationLine = [business.addressLine, business.locality, business.province]
    .filter((value): value is string => Boolean(value))
    .join(", ");
  const hasStructuredAddress = Boolean(
    business.addressLine || business.locality || business.province,
  );
  const structuredData =
    !degraded && hasStructuredAddress
      ? {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: business.name,
          description: business.summary,
          address: {
            "@type": "PostalAddress",
            ...(business.addressLine ? { streetAddress: business.addressLine } : {}),
            ...(business.locality ? { addressLocality: business.locality } : {}),
            ...(business.province ? { addressRegion: business.province } : {}),
          },
          ...(business.contactPhone ? { telephone: business.contactPhone } : {}),
          ...(business.publicEmail ? { email: business.publicEmail } : {}),
          ...(website ? { url: website } : {}),
          ...(business.socialLinks.length
            ? { sameAs: business.socialLinks.map((link) => link.url) }
            : {}),
        }
      : null;
  const currentWeekday =
    openingHoursResult?.status === "fulfilled"
      ? getCurrentWeekdayInTimezone(new Date(), openingHoursResult.value.timezone)
      : null;
  const copy = buildBusinessPageContent(business, city.name, business.moduleLabel);
  const formatServicePrice = (priceCents: number | null) =>
    priceCents === null
      ? null
      : new Intl.NumberFormat("it-IT", {
          style: "currency",
          currency: business.currency,
          minimumFractionDigits: 2,
        }).format(priceCents / 100);

  return (
    <PublicShell
      toneLabel={business.categoryLabel}
      title={business.name}
      description={business.summary}
      citySlug={city.slug}
      accentNote={business.trustLine}
    >
      <section className="public-stack">
        {structuredData ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
            }}
          />
        ) : null}
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
              {openingStatus ? (
                <span className="pill">
                  {openingStatus.label}
                  {openingStatus.detail ? ` · ${openingStatus.detail}` : ""}
                </span>
              ) : null}
            </div>

            <h2>{pickupOrderMenu ? "Ordina per il ritiro" : "Contatta l'attività"}</h2>
            <p>{business.heroDescription}</p>

            <div className="cta-row">
              <a className="cta-button" href={primaryAction.href}>
                {primaryAction.label}
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
              {business.locality || business.province ? (
                <div>
                  <dt>Località</dt>
                  <dd>{[business.locality, business.province].filter(Boolean).join(", ")}</dd>
                </div>
              ) : null}
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
            <a className="cta-button" href={primaryAction.href}>
              {primaryAction.label}
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

        {pickupOrderMenu ? (
          <PublicPickupOrderForm
            citySlug={city.slug}
            businessSlug={business.slug}
            currency={pickupOrderMenu.currency}
            timezone={pickupOrderMenu.timezone}
            minimumOrderCents={pickupOrderMenu.minimumOrderCents}
            items={pickupOrderMenu.items}
          />
        ) : null}

        {degraded ? (
          <section className="spotlight-card" aria-live="polite">
            <p>
              Le richieste non sono disponibili mentre vengono visualizzati contenuti dimostrativi.
            </p>
          </section>
        ) : (
          <PublicInquiryForm citySlug={city.slug} businessSlug={business.slug} />
        )}

        {!degraded ? (
          <section className="public-list-grid" id="services">
            <div className="section-header">
              <p className="section-label">Servizi</p>
              <h2>Servizi</h2>
            </div>
            {servicesResult?.status === "rejected" ? (
              <p>I servizi non sono momentaneamente disponibili.</p>
            ) : services.length ? (
              services.map((service) => (
                <article className="public-card" key={service.id}>
                  <h3>{service.name}</h3>
                  {service.shortDescription && service.shortDescription !== service.description ? (
                    <p>{service.shortDescription}</p>
                  ) : null}
                  {service.description ? <p>{service.description}</p> : null}
                  {service.priceLabel || service.priceCents !== null || service.durationMinutes ? (
                    <p>
                      {[
                        service.priceLabel ?? formatServicePrice(service.priceCents),
                        formatServiceDuration(service.durationMinutes),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </article>
              ))
            ) : (
              <p>Questa attività non ha ancora pubblicato servizi.</p>
            )}
          </section>
        ) : null}
        {!degraded ? (
          <section className="public-list-grid" id="opening-hours">
            <div className="section-header">
              <p className="section-label">Disponibilità</p>
              <h2>Orari di apertura</h2>
            </div>
            {openingHoursResult?.status === "rejected" ? (
              <p>Gli orari non sono momentaneamente disponibili.</p>
            ) : openingDays.length ? (
              openingDays
                .slice()
                .sort((a, b) => a.weekday - b.weekday)
                .map((day) => (
                  <p
                    key={day.weekday}
                    aria-current={day.weekday === currentWeekday ? "date" : undefined}
                    className={
                      day.weekday === currentWeekday ? "public-opening-day-current" : undefined
                    }
                  >
                    <strong>{weekdays[day.weekday]}</strong> · {formatOpeningDay(day)}
                    {day.weekday === currentWeekday ? " · Oggi" : ""}
                  </p>
                ))
            ) : (
              <p>Gli orari non sono ancora disponibili.</p>
            )}
          </section>
        ) : null}
        <section className="public-list-grid">
          <div className="section-header">
            <p className="section-label">Informazioni</p>
            <h2>Contatti e informazioni</h2>
          </div>
          {phoneHref ? (
            <a className="text-link" href={phoneHref}>
              {business.contactPhone}
            </a>
          ) : null}
          {emailHref ? (
            <a className="text-link" href={emailHref}>
              {business.publicEmail}
            </a>
          ) : null}
          {website ? (
            <a className="text-link" href={website} target="_blank" rel="noopener noreferrer">
              Visita il sito
            </a>
          ) : null}
          {locationLine ? <p>{locationLine}</p> : null}
          {!phoneHref && !emailHref && !website && !locationLine ? (
            <p>Usa il modulo di richiesta per contattare questa attività.</p>
          ) : null}
          {business.socialLinks.length ? (
            <div className="public-social-links" aria-label="Seguici">
              <strong>Seguici</strong>
              {business.socialLinks.map((social) => (
                <a
                  key={social.label}
                  className="text-link"
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Seguici su ${social.label}`}
                >
                  {social.label}
                </a>
              ))}
            </div>
          ) : null}
        </section>

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
