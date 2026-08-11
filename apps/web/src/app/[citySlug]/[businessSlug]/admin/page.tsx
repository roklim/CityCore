import Link from "next/link";
import { AdminCollectionError } from "../../../../components/admin-collection-state";
import { AdminStatusBadge } from "../../../../components/admin-status-badge";
import {
  businessAdminBasePath,
  businessAdminSectionPath,
} from "../../../../lib/business-admin-navigation";
import {
  businessAdminApiPath,
  getBusinessAdminContext,
  loadBusinessAdminResponse,
} from "../../../../lib/business-admin-server";
import { readinessSummary } from "../../../../lib/business-admin-logic";
import type {
  PlatformBusinessInquiriesResponse,
  PlatformBusinessServicesResponse,
  PlatformPublishReadinessResponse,
} from "../../../../lib/platform-api";

export const metadata = { title: "Panoramica attività" };

type BusinessDashboardProps = {
  params: Promise<{ citySlug: string; businessSlug: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
};

export default async function BusinessDashboard({ params, searchParams }: BusinessDashboardProps) {
  const { citySlug, businessSlug } = await params;
  const feedback = await searchParams;
  const { session, business } = await getBusinessAdminContext(citySlug, businessSlug);
  const apiPath = businessAdminApiPath(citySlug, businessSlug);
  const basePath = businessAdminBasePath(citySlug, businessSlug);
  const [services, readiness, newInquiries, readInquiries] = await Promise.all([
    loadBusinessAdminResponse<PlatformBusinessServicesResponse>(
      `${apiPath}/services`,
      session.token,
    ),
    loadBusinessAdminResponse<PlatformPublishReadinessResponse>(
      `${apiPath}/publish-readiness`,
      session.token,
    ),
    loadBusinessAdminResponse<PlatformBusinessInquiriesResponse>(
      `${apiPath}/inquiries?status=new&page=1&limit=1`,
      session.token,
    ),
    loadBusinessAdminResponse<PlatformBusinessInquiriesResponse>(
      `${apiPath}/inquiries?status=read&page=1&limit=1`,
      session.token,
    ),
  ]);
  const hasLoadError = [services, readiness, newInquiries, readInquiries].some(
    (state) => state.failed,
  );
  const openInquiryCount = (newInquiries.data?.total ?? 0) + (readInquiries.data?.total ?? 0);

  return (
    <>
      {feedback.notice ? (
        <p className="surface-success" role="status">
          {feedback.notice}
        </p>
      ) : null}
      {feedback.error ? (
        <p className="surface-error" role="alert">
          {feedback.error}
        </p>
      ) : null}
      {hasLoadError ? (
        <AdminCollectionError
          message="Non è stato possibile aggiornare tutti gli indicatori dell’attività."
          retryHref={basePath}
        />
      ) : null}

      <section aria-labelledby="business-overview-title">
        <div className="section-header">
          <p className="section-label">Stato corrente</p>
          <h2 id="business-overview-title">Panoramica operativa</h2>
        </div>
        <div className="stats-grid business-dashboard-stats">
          <article className="metric-card">
            <span>Stato</span>
            <AdminStatusBadge status={business.status} />
            <p>{business.status === "active" ? "Visibile nella directory" : "Non pubblicata"}</p>
          </article>
          <article className="metric-card">
            <span>Readiness</span>
            <strong>{readiness.data ? readinessSummary(readiness.data.item) : "—"}</strong>
            <p>{readiness.data?.item.missingRequirements.length ?? 0} requisiti mancanti</p>
          </article>
          <article className="metric-card">
            <span>Servizi</span>
            <strong>{services.data?.items.length ?? "—"}</strong>
            <p>Voci configurate</p>
          </article>
          <article className="metric-card">
            <span>Richieste aperte</span>
            <strong>{newInquiries.data && readInquiries.data ? openInquiryCount : "—"}</strong>
            <p>Nuove o lette</p>
          </article>
          <article className="metric-card">
            <span>Modulo principale</span>
            <strong>{business.template.primaryModule}</strong>
            <p>{business.template.name}</p>
          </article>
        </div>
      </section>

      <section aria-labelledby="business-quick-title">
        <div className="section-header">
          <p className="section-label">Azioni rapide</p>
          <h2 id="business-quick-title">Continua la configurazione</h2>
        </div>
        <div className="admin-quick-grid business-quick-grid">
          {[
            ["profile", "Completa profilo", "Identità, contatti e social"],
            ["categories", "Gestisci categorie", "Classificazione cittadina"],
            ["services", "Gestisci servizi", "Catalogo e prezzi"],
            ["hours", "Configura orari", "Settimana di apertura"],
            ["publication", "Pubblicazione", "Readiness e visibilità"],
            ["inquiries", "Richieste ricevute", `${openInquiryCount} aperte`],
          ].map(([segment, label, description]) => (
            <Link
              className="admin-quick-card"
              href={businessAdminSectionPath(
                citySlug,
                businessSlug,
                segment as
                  | "profile"
                  | "categories"
                  | "services"
                  | "hours"
                  | "publication"
                  | "inquiries",
              )}
              key={segment}
            >
              <span>{business.name}</span>
              <strong>{label}</strong>
              <p>{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
