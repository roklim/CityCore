import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
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
        toneLabel="Contenuti dimostrativi"
        title="Scheda temporaneamente non disponibile."
        description="I dati dell'attività non sono disponibili in questo momento."
        contextLabel={city.name}
        contextHref={`/${city.slug}`}
        accentNote="Le richieste e gli ordini restano disattivati finché i dati live non tornano disponibili."
      >
        <section className="public-stack">
          <section className="spotlight-card" aria-live="polite">
            <p className="section-label">Aggiornamento in corso</p>
            <h2>Riprova tra poco.</h2>
            <p>Puoi tornare alla directory per esplorare le altre attività della città.</p>
            <Link className="text-link" href={`/${city.slug}`}>
              Torna a {city.name}
            </Link>
          </section>
        </section>
      </PublicShell>
    );
  }

  return (
    <PublicShell
      toneLabel={business.categories[0]?.name ?? business.categoryLabel}
      title={business.name}
      description={business.summary}
      contextLabel={city.name}
      contextHref={`/${city.slug}`}
      accentNote={
        locationLine
          ? `Dove trovarla: ${locationLine}.`
          : "Consulta i contatti per ricevere informazioni dall'attività."
      }
    >
      <section className="public-stack">
        {business.categories.length ? (
          <div className="pill-row" aria-label="Categorie attività">
            {business.categories.map((category) => (
              <span className="pill" key={category.id}>
                {category.name}
              </span>
            ))}
          </div>
        ) : null}
        {structuredData ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
            }}
          />
        ) : null}

        <section className="spotlight-card spotlight-primary business-action-card">
          {openingStatus ? (
            <div className="card-topline">
              <span className="pill">
                {openingStatus.label}
                {openingStatus.detail ? ` · ${openingStatus.detail}` : ""}
              </span>
            </div>
          ) : null}
          <div>
            <p className="section-label">Prossimo passo</p>
            <h2>{primaryAction.heading}</h2>
          </div>
          <div className="cta-row">
            <a
              className="cta-button"
              href={primaryAction.href}
              target={primaryAction.external ? "_blank" : undefined}
              rel={primaryAction.external ? "noopener noreferrer" : undefined}
            >
              {primaryAction.label}
            </a>
          </div>
        </section>

        <section className="public-list-grid" id="services">
          <div className="section-header">
            <p className="section-label">Servizi</p>
            <h2>Servizi disponibili</h2>
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
                  <strong>{weekdays[day.weekday]}</strong> · {formatOpeningDayWithNote(day)}
                  {day.weekday === currentWeekday ? " · Oggi" : ""}
                </p>
              ))
          ) : (
            <p>Gli orari non sono ancora disponibili.</p>
          )}
        </section>

        <section className="public-list-grid">
          <div className="section-header">
            <p className="section-label">Informazioni</p>
            <h2>Contatti e indirizzo</h2>
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
            <div className="public-social-links" aria-label="Seguici" role="group">
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
      </section>
    </PublicShell>
  );
}
