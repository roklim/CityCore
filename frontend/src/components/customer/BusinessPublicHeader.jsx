import { businessAdminHref, businessHref, cityHomeHref } from "../../utils/format";

export default function BusinessPublicHeader({
  businessName,
  businessSlug,
  businessTypeLabel,
  businessLogoUrl,
  counterOpen,
  getInitials,
}) {
  return (
    <header className="business-public-header">
      <a
        className="business-home-link"
        href={cityHomeHref()}
        aria-label="Torna alle attivita della citta"
      >
        <span aria-hidden="true">&lt;</span>
        Tutte le attivita
      </a>
      <a className="business-header-brand" href={businessHref(businessSlug)}>
        {businessLogoUrl ? (
          <img src={businessLogoUrl} alt="" loading="lazy" />
        ) : (
          <span>{getInitials(businessName)}</span>
        )}
        <div>
          <strong>{businessName}</strong>
          <small>{businessTypeLabel}</small>
        </div>
      </a>
      <div className="business-header-actions">
        <span
          className={`business-status-pill ${counterOpen ? "open" : "closed"}`}
        >
          {counterOpen ? "Aperto" : "Chiuso"}
        </span>
        <a href={businessAdminHref(businessSlug)}>Admin</a>
      </div>
    </header>
  );
}
