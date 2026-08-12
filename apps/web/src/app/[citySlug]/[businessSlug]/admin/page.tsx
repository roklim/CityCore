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
import { nextReadinessAction, readinessSummary } from "../../../../lib/business-admin-logic";
import { isBusinessPublic } from "../../../../lib/business-visibility";
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
  const canManageBusiness = session.auth.activeAccess.permissions.includes("businesses.manage");
  const [services, readiness] = await Promise.all([
    loadBusinessAdminResponse<PlatformBusinessServicesResponse>(
      `${apiPath}/services`,
      session.token,
    ),
    loadBusinessAdminResponse<PlatformPublishReadinessResponse>(
      `${apiPath}/publish-readiness`,
      session.token,
    ),
  ]);
  const inquiryStates = canManageBusiness
    ? await Promise.all([
        loadBusinessAdminResponse<PlatformBusinessInquiriesResponse>(
          `${apiPath}/inquiries?status=new&page=1&limit=1`,
          session.token,
        ),
        loadBusinessAdminResponse<PlatformBusinessInquiriesResponse>(
          `${apiPath}/inquiries?status=read&page=1&limit=1`,
          session.token,
        ),
      ])
    : [];
  const [newInquiries, readInquiries] = inquiryStates;
  const hasLoadError = [services, readiness, ...inquiryStates].some((state) => state.failed);
  const openInquiryCount = (newInquiries?.data?.total ?? 0) + (readInquiries?.data?.total ?? 0);
  const canManageCity = session.auth.activeAccess.permissions.includes("cities.manage");
  const nextAction = readiness.data
    ? nextReadinessAction(readiness.data.item, citySlug, businessSlug, canManageCity)
    : null;
  const publicationPath = businessAdminSectionPath(citySlug, businessSlug, "publication");
  const isPublic = isBusinessPublic(business);

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
            <p>
              {isPublic
                ? "Visibile nella directory"
                : business.status === "active"
                  ? "Città non pubblica"
                  : "Non pubblicata"}
            </p>
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
            <strong>
              {canManageBusiness && newInquiries?.data && readInquiries?.data
                ? openInquiryCount
                : "—"}
            </strong>
            <p>{canManageBusiness ? "Nuove o lette" : "Non disponibile per questo ruolo"}</p>
          </article>
          <article className="metric-card">
            <span>Modulo principale</span>
            <strong>{business.template.primaryModule}</strong>
            <p>{business.template.name}</p>
          </article>
        </div>
      </section>

      {readiness.data ? (
        <section className="admin-state-card" aria-labelledby="next-step-title">
          <div>
            <p className="section-label">Prossimo passaggio</p>
            <h2 id="next-step-title">
              {nextAction
                ? nextAction.label
                : isPublic
                  ? "Attività online"
                  : business.status === "active"
                    ? "Attendi la pubblicazione della città"
                    : "Pubblica l'attività"}
            </h2>
          </div>
          <p>
            {nextAction
              ? "CityCore ha individuato il primo requisito da completare. Salva i dati e torna qui per continuare."
              : isPublic
                ? "La scheda è pubblica e può ricevere richieste dagli utenti."
                : business.status === "active"
                  ? "La scheda è pronta, ma sarà visibile solo quando la città sarà pubblica."
                  : "La checklist è completa: controlla il riepilogo e pubblica la scheda."}
          </p>
          {nextAction?.href ? (
            <Link className="form-button" href={nextAction.href}>
              {nextAction.label} →
            </Link>
          ) : nextAction ? (
            <span className="admin-muted-label">{nextAction.label}</span>
          ) : (
            <Link
              className="form-button"
              href={
                isPublic
                  ? `/${encodeURIComponent(citySlug)}/${encodeURIComponent(businessSlug)}`
                  : publicationPath
              }
            >
              {isPublic ? "Apri pagina pubblica" : "Vai alla pubblicazione"} →
            </Link>
          )}
        </section>
      ) : null}

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
          ]
            .filter(([segment]) => segment !== "inquiries" || canManageBusiness)
            .map(([segment, label, description]) => (
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
