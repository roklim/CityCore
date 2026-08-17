import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BusinessOpeningStatus } from "../../../components/public-business/business-opening-status";
import { PublicInquiryForm } from "../../../components/public-business/public-inquiry-form";
import { PublicPickupOrderForm } from "../../../components/public-business/public-pickup-order-form";
import { PublicShell } from "../../../components/public-shell";
import {
  getPublicBusinessOpeningHours,
  getPublicBusinessMetadataData,
  getPublicBusinessServices,
  getPublicBusinessSurfaceData,
  getPublicPickupOrderMenu,
  formatPublicBusinessLocation,
} from "../../../lib/public-runtime";
import {
  formatOpeningDayWithNote,
  formatServiceDuration,
  getBusinessOpeningStatus,
  getCurrentWeekdayInTimezone,
  sortPublicBusinessServices,
  weekdays,
} from "../../../lib/business-opening-hours";
import { normalizeExternalUrl, normalizePhoneHref } from "../../../lib/public-links";
import { getPublicBusinessPrimaryAction } from "../../../lib/public-actions";

type BusinessPageProps = {
  params: Promise<{ citySlug: string; businessSlug: string }>;
};

const schemaWeekdays = [
  "https://schema.org/Monday",
  "https://schema.org/Tuesday",
  "https://schema.org/Wednesday",
  "https://schema.org/Thursday",
  "https://schema.org/Friday",
  "https://schema.org/Saturday",
  "https://schema.org/Sunday",
] as const;

function initials(value: string) {
  return value
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export async function generateMetadata({ params }: BusinessPageProps): Promise<Metadata> {
  const { citySlug, businessSlug } = await params;
  const surface = await getPublicBusinessMetadataData(citySlug, businessSlug);

  if (!surface) {
    return { title: "Attività non trovata", robots: { index: false, follow: false } };
  }

  if (surface.degraded) {
    const canonical = `/${encodeURIComponent(citySlug)}/${encodeURIComponent(businessSlug)}`;
    const title = "Scheda attività temporaneamente non disponibile";
    const description = "I dati pubblici dell'attività non sono disponibili in questo momento.";

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { type: "website", locale: "it_IT", title, description, url: canonical },
      robots: { index: false, follow: false },
    };
  }

  const canonical = `/${encodeURIComponent(surface.citySlug)}/${encodeURIComponent(surface.business.slug)}`;
  const title = surface.business.seoTitle ?? surface.business.name;
  const description = surface.business.seoDescription ?? surface.business.summary;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "website", locale: "it_IT", title, description, url: canonical },
  };
}

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { citySlug, businessSlug } = await params;
  const surface = await getPublicBusinessSurfaceData(citySlug, businessSlug);

  if (!surface) notFound();

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
  const primaryAction = getPublicBusinessPrimaryAction({
    pickupOrderAvailable: Boolean(pickupOrderMenu),
    inquiryAvailable: true,
    phoneHref,
    emailHref,
    website,
  });
  const locationLine = formatPublicBusinessLocation({
    addressLine: business.addressLine,
    addressLine2: business.addressLine2,
    postalCode: business.postalCode,
    locality: business.locality,
    province: business.province,
  });
  const locationSummary = business.locality ?? business.province ?? city.name;
  const categoryLabel = business.categories[0]?.name ?? business.categoryLabel;
  const structuredStreetAddress = [business.addressLine, business.addressLine2]
    .filter((value): value is string => Boolean(value))
    .join(", ");
  const hasStructuredAddress = Boolean(
    structuredStreetAddress || business.postalCode || business.locality || business.province,
  );
  const structuredData = !degraded
    ? {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: business.name,
        description: business.summary,
        ...(hasStructuredAddress
          ? {
              address: {
                "@type": "PostalAddress",
                ...(structuredStreetAddress ? { streetAddress: structuredStreetAddress } : {}),
                ...(business.postalCode ? { postalCode: business.postalCode } : {}),
                ...(business.locality ? { addressLocality: business.locality } : {}),
                ...(business.province ? { addressRegion: business.province } : {}),
                ...(city.country ? { addressCountry: city.country } : {}),
              },
            }
          : {}),
        ...(business.contactPhone ? { telephone: business.contactPhone } : {}),
        ...(business.publicEmail ? { email: business.publicEmail } : {}),
        ...(website ? { url: website } : {}),
        ...(business.socialLinks.length
          ? { sameAs: business.socialLinks.map((link) => link.url) }
          : {}),
        ...(openingDays.some((day) => !day.isClosed && day.intervals.length)
          ? {
              openingHoursSpecification: openingDays.flatMap((day) =>
                day.isClosed
                  ? []
                  : day.intervals.map((interval) => ({
                      "@type": "OpeningHoursSpecification",
                      dayOfWeek: schemaWeekdays[day.weekday],
                      opens: interval.opensAt,
                      closes: interval.closesAt,
                      ...(day.note ? { description: day.note } : {}),
                    })),
              ),
            }
          : {}),
      }
    : null;
  const currentWeekday =
    openingHoursResult?.status === "fulfilled"
      ? getCurrentWeekdayInTimezone(new Date(), openingHoursResult.value.timezone)
      : null;
  const formatServicePrice = (priceCents: number | null) =>
    priceCents === null
      ? null
      : new Intl.NumberFormat("it-IT", {
          style: "currency",
          currency: business.currency,
          minimumFractionDigits: 2,
        }).format(priceCents / 100);

  if (degraded) {
    return (
      <PublicShell
        toneLabel="Dati non disponibili"
        title="Scheda temporaneamente non disponibile"
        description="I dati dell'attività non sono disponibili in questo momento."
        contextLabel={city.name}
        contextHref={`/${city.slug}`}
        accentNote="Richieste e ordini non sono disponibili finché le informazioni non tornano raggiungibili."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: city.name, href: `/${city.slug}` },
          { label: "Scheda non disponibile" },
        ]}
      >
        <nav className="cta-row" aria-label="Come continuare">
          <Link className="cta-button" href={`/${city.slug}#directory`}>
            Vedi altre attività a {city.name}
          </Link>
          <Link className="text-link" href="/#citycore-city-search">
            Cambia città
          </Link>
        </nav>
      </PublicShell>
    );
  }

  return (
    <PublicShell
      toneLabel={categoryLabel}
      title={business.name}
      description={business.summary}
      contextLabel={city.name}
      contextHref={`/${city.slug}`}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: city.name, href: `/${city.slug}` },
        { label: business.name },
      ]}
      heroClassName="public-business-hero"
      heroActions={
        <nav className="cta-row public-business-hero-actions" aria-label="Azioni principali">
          <a
            className="cta-button"
            href={primaryAction.href}
            target={primaryAction.external ? "_blank" : undefined}
            rel={primaryAction.external ? "noopener noreferrer" : undefined}
          >
            {primaryAction.label}
          </a>
          <Link className="text-link" href={services.length ? "#services" : "#contact"}>
            {services.length ? "Vedi i servizi" : "Contatti e indirizzo"}
          </Link>
        </nav>
      }
      heroAside={
        <div className="public-business-identity" aria-label={`Identità di ${business.name}`}>
          <div className="public-business-identity-glow" aria-hidden="true" />
          <span className="public-business-monogram" aria-hidden="true">
            {initials(business.name)}
          </span>
          <div className="public-business-identity-copy">
            <span>{categoryLabel}</span>
            <strong>{locationSummary}</strong>
            <small>CityCore · {city.name}</small>
          </div>
        </div>
      }
    >
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}

      <div className="public-stack public-business-page">
        <section className="public-business-overview" aria-label="Informazioni principali">
          <div className="public-business-fact">
            <span>Disponibilità</span>
            {openingHoursResult?.status === "fulfilled" && openingStatus ? (
              <BusinessOpeningStatus
                days={openingDays}
                initialStatus={openingStatus}
                timezone={openingHoursResult.value.timezone}
              />
            ) : (
              <strong>Contatta l'attività</strong>
            )}
          </div>
          <div className="public-business-fact">
            <span>Servizi</span>
            <strong>
              {services.length
                ? `${services.length} ${services.length === 1 ? "servizio" : "servizi"}`
                : "Su richiesta"}
            </strong>
          </div>
          <div className="public-business-fact">
            <span>Località</span>
            <strong>{locationSummary}</strong>
          </div>
          {business.categories.length > 1 ? (
            <div className="pill-row public-business-categories" aria-label="Categorie attività">
              {business.categories.slice(1).map((category) => (
                <span className="pill" key={category.id}>
                  {category.name}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <section className="public-business-section public-contact-details" id="contact">
          <div className="section-header public-business-section-heading">
            <div>
              <p className="section-label">Contatti</p>
              <h2>Parla con {business.name}</h2>
            </div>
            <p>Usa il canale più comodo oppure raggiungi direttamente l'attività.</p>
          </div>
          <div className="public-contact-grid">
            {phoneHref ? (
              <a className="public-contact-card" href={phoneHref}>
                <span>Telefono</span>
                <strong>{business.contactPhone}</strong>
                <small>Chiama ora →</small>
              </a>
            ) : null}
            {emailHref ? (
              <a className="public-contact-card" href={emailHref}>
                <span>Email</span>
                <strong>{business.publicEmail}</strong>
                <small>Scrivi un'email →</small>
              </a>
            ) : null}
            {website ? (
              <a
                className="public-contact-card"
                href={website}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Sito web</span>
                <strong>Visita il sito</strong>
                <small>Apri in una nuova scheda →</small>
              </a>
            ) : null}
            {locationLine ? (
              <div className="public-contact-card is-location">
                <span>Indirizzo</span>
                <address>{locationLine}</address>
                <small>{city.name}</small>
              </div>
            ) : null}
          </div>
          {!phoneHref && !emailHref && !website && !locationLine ? (
            <p>Usa il modulo di richiesta per contattare questa attività.</p>
          ) : null}
          {business.socialLinks.length ? (
            <div className="public-social-links" aria-label="Canali social">
              <strong>Segui l'attività</strong>
              {business.socialLinks.map((social) => (
                <a
                  key={social.label}
                  className="text-link"
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Apri ${social.label}`}
                >
                  {social.label}
                </a>
              ))}
            </div>
          ) : null}
        </section>

        <section className="public-business-section public-services-section" id="services">
          <div className="section-header public-business-section-heading">
            <div>
              <p className="section-label">Servizi</p>
              <h2>Servizi disponibili</h2>
            </div>
            {services.length ? (
              <span className="public-section-count">
                {services.length} {services.length === 1 ? "voce" : "voci"}
              </span>
            ) : null}
          </div>
          {servicesResult?.status === "rejected" ? (
            <p>I servizi non sono momentaneamente disponibili.</p>
          ) : services.length ? (
            <ul className="public-service-list">
              {services.map((service) => {
                const facts = [
                  service.priceLabel ?? formatServicePrice(service.priceCents),
                  formatServiceDuration(service.durationMinutes),
                ].filter(Boolean);

                return (
                  <li className="public-service-row" key={service.id}>
                    <div className="public-service-copy">
                      <h3>{service.name}</h3>
                      {service.shortDescription &&
                      service.shortDescription !== service.description ? (
                        <p>{service.shortDescription}</p>
                      ) : null}
                      {service.description ? <p>{service.description}</p> : null}
                    </div>
                    {facts.length ? (
                      <p className="public-service-facts">{facts.join(" · ")}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>Questa attività non ha ancora pubblicato servizi.</p>
          )}
        </section>

        <section className="public-business-section public-hours-section" id="opening-hours">
          <div className="section-header public-business-section-heading">
            <div>
              <p className="section-label">Disponibilità</p>
              <h2>Orari di apertura</h2>
            </div>
            {openingHoursResult?.status === "fulfilled" && openingStatus ? (
              <BusinessOpeningStatus
                days={openingDays}
                initialStatus={openingStatus}
                timezone={openingHoursResult.value.timezone}
              />
            ) : null}
          </div>
          {openingHoursResult?.status === "rejected" ? (
            <p>Gli orari non sono momentaneamente disponibili.</p>
          ) : openingDays.length ? (
            <dl className="public-hours-list">
              {openingDays
                .slice()
                .sort((a, b) => a.weekday - b.weekday)
                .map((day) => {
                  const isToday = day.weekday === currentWeekday;
                  return (
                    <div
                      key={day.weekday}
                      aria-current={isToday ? "date" : undefined}
                      className={`public-hours-row${isToday ? " public-opening-day-current" : ""}`}
                    >
                      <dt>
                        {weekdays[day.weekday]}
                        {isToday ? <span> · Oggi</span> : null}
                      </dt>
                      <dd>{formatOpeningDayWithNote(day)}</dd>
                    </div>
                  );
                })}
            </dl>
          ) : (
            <p>Gli orari non sono ancora disponibili.</p>
          )}
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

        <PublicInquiryForm citySlug={city.slug} businessSlug={business.slug} />
      </div>
    </PublicShell>
  );
}
