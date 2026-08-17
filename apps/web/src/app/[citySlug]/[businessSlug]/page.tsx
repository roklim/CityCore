import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BusinessOpeningStatus } from "../../../components/public-business/business-opening-status";
import { BusinessVisualGallery } from "../../../components/public-business/business-visual-gallery";
import businessShowcase from "../../../components/public-business/business-showcase.module.css";
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
import { getContextualBusinessSummary } from "../../../lib/public-copy";

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
  const publicSummary = getContextualBusinessSummary(business.summary, business.name, city.name);
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
    .filter((value): value is string => Boolean(value?.trim()))
    .join(", ");
  const hasStreetAddress = Boolean(structuredStreetAddress || business.postalCode?.trim());
  const displayLocationLine = hasStreetAddress ? locationLine : null;
  const hasContactDetails = Boolean(
    phoneHref || emailHref || website || displayLocationLine || business.socialLinks.length,
  );
  const secondaryAction = services.length
    ? { href: "#services", label: "Vedi i servizi" }
    : hasContactDetails
      ? { href: "#contact", label: "Contatti" }
      : { href: "#opening-hours", label: "Vedi gli orari" };
  const visualSource = {
    slug: business.slug,
    name: business.name,
    categoryLabel,
    categories: business.categories.map((category) => ({ name: category.name })),
    services: services.map((service) => service.name),
  };
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
  const pageNavigation = [
    {
      href: "#overview",
      label: "Panoramica",
      description: "Stato e informazioni essenziali",
    },
    ...(hasContactDetails
      ? [{ href: "#contact", label: "Contatti", description: "Recapiti pubblicati" }]
      : []),
    ...(servicesResult?.status === "rejected" || services.length
      ? [{ href: "#services", label: "Servizi", description: "Offerta disponibile" }]
      : []),
    {
      href: "#opening-hours",
      label: "Orari",
      description: "Giorni e disponibilità",
    },
    ...(pickupOrderMenu
      ? [{ href: "#order", label: "Ritiro", description: "Ordina e passa a ritirare" }]
      : []),
    {
      href: "#inquiry-form",
      label: "Richiesta",
      description: "Invia un messaggio",
    },
  ];

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
            Vedi altre attività
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
      description={publicSummary}
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
          <Link className="text-link" href={secondaryAction.href}>
            {secondaryAction.label}
          </Link>
        </nav>
      }
      heroAside={
        <BusinessVisualGallery
          name={business.name}
          cityName={city.name}
          categoryLabel={categoryLabel}
          visualSource={visualSource}
        />
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

      <div className={businessShowcase.contentLayout}>
        <aside className={businessShowcase.sidebar} aria-label="Navigazione della scheda">
          <div className={businessShowcase.sidebarCard}>
            <div className={businessShowcase.sidebarHeading}>
              <span>Esplora</span>
              <strong>In questa pagina</strong>
            </div>
            <nav className={businessShowcase.sectionNav} aria-label="Sezioni disponibili">
              {pageNavigation.map((item) => (
                <a className={businessShowcase.sectionNavLink} href={item.href} key={item.href}>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </a>
              ))}
            </nav>
            <div className={businessShowcase.sidebarFooter}>
              <span>Serve altro?</span>
              <a href="#inquiry-form">Invia una richiesta →</a>
            </div>
          </div>
        </aside>

        <div className={businessShowcase.contentStack}>
          <section
            className={`${businessShowcase.sectionPanel} public-business-overview${services.length ? "" : ` ${businessShowcase.overviewTwoColumns}`}`}
            id="overview"
            aria-label="Informazioni principali"
          >
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
            {services.length ? (
              <div className="public-business-fact">
                <span>Servizi</span>
                <strong>
                  {services.length} {services.length === 1 ? "servizio" : "servizi"}
                </strong>
              </div>
            ) : null}
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

          {!hasContactDetails ? (
            <section className={businessShowcase.requestIntro} aria-label="Richiedi informazioni">
              <div>
                <span>Contatto diretto</span>
                <strong>Hai bisogno di informazioni?</strong>
                <p>
                  Non sono ancora stati pubblicati recapiti diretti. Puoi comunque inviare una
                  richiesta dalla scheda.
                </p>
              </div>
              <a className="cta-button" href="#inquiry-form">
                Invia una richiesta
              </a>
            </section>
          ) : null}

          {hasContactDetails ? (
            <section
              className={`${businessShowcase.sectionPanel} public-business-section public-contact-details`}
              id="contact"
            >
              <div className="section-header public-business-section-heading">
                <div>
                  <p className="section-label">Contatti</p>
                  <h2>Contatti e recapiti</h2>
                </div>
                <p>Usa uno dei canali effettivamente pubblicati.</p>
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
                {displayLocationLine ? (
                  <div className="public-contact-card is-location">
                    <span>Indirizzo</span>
                    <address>{displayLocationLine}</address>
                    <small>Indirizzo pubblicato</small>
                  </div>
                ) : null}
              </div>
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
          ) : null}

          {servicesResult?.status === "rejected" ? (
            <section
              className={`${businessShowcase.sectionPanel} public-business-section public-services-section`}
              id="services"
            >
              <div className="section-header public-business-section-heading">
                <div>
                  <p className="section-label">Servizi</p>
                  <h2>Servizi disponibili</h2>
                </div>
              </div>
              <p>I servizi non sono momentaneamente disponibili.</p>
            </section>
          ) : services.length ? (
            <section
              className={`${businessShowcase.sectionPanel} public-business-section public-services-section`}
              id="services"
            >
              <div className="section-header public-business-section-heading">
                <div>
                  <p className="section-label">Servizi</p>
                  <h2>Servizi disponibili</h2>
                </div>
                <span className="public-section-count">
                  {services.length} {services.length === 1 ? "voce" : "voci"}
                </span>
              </div>
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
            </section>
          ) : null}

          <section
            className={`${businessShowcase.sectionPanel} public-business-section public-hours-section`}
            id="opening-hours"
          >
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
            <div className={businessShowcase.formPanel}>
              <PublicPickupOrderForm
                citySlug={city.slug}
                businessSlug={business.slug}
                currency={pickupOrderMenu.currency}
                timezone={pickupOrderMenu.timezone}
                minimumOrderCents={pickupOrderMenu.minimumOrderCents}
                items={pickupOrderMenu.items}
              />
            </div>
          ) : null}

          <div className={businessShowcase.formPanel}>
            <PublicInquiryForm citySlug={city.slug} businessSlug={business.slug} />
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
