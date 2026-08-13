import { MODULE_DEFINITIONS } from "@platform/templates";
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
  const permissions = new Set(session.auth.activeAccess.permissions);
  const canManageBusiness = permissions.has("businesses.manage");
  const canManageCatalog = permissions.has("catalog.manage");
  const canManageSettings = permissions.has("settings.manage");
  const canManageModules = permissions.has("modules.manage");
  const hasCatalog = business.modules.some(
    (module) => module.moduleCode === "catalog" && module.active,
  );
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
  const nextRequirement = readiness.data?.item.missingRequirements[0];
  const canCompleteNextAction =
    nextRequirement === "active_city" ? canManageCity : canManageBusiness;
  const publicationPath = businessAdminSectionPath(citySlug, businessSlug, "publication");
  const isPublic = isBusinessPublic(business);
  const primaryModuleLabel =
    MODULE_DEFINITIONS.find((module) => module.code === business.template.primaryModule)?.label ??
    business.template.primaryModule;
  const inquirySummary =
    newInquiries?.data && readInquiries?.data ? `${openInquiryCount} aperte` : "Apri l’inbox";
  const quickActions = [
    {
      segment: "profile" as const,
      label: canManageBusiness ? "Completa profilo" : "Consulta profilo",
      description: canManageBusiness ? "Identità, contatti e social" : "Dati in sola lettura",
    },
    {
      segment: "categories" as const,
      label: canManageBusiness ? "Gestisci categorie" : "Consulta categorie",
      description: canManageBusiness ? "Classificazione cittadina" : "Categorie in sola lettura",
    },
    {
      segment: "services" as const,
      label: canManageCatalog ? "Gestisci servizi" : "Consulta servizi",
      description: canManageCatalog ? "Catalogo e prezzi" : "Catalogo in sola lettura",
    },
    {
      segment: "hours" as const,
      label: canManageSettings ? "Configura orari" : "Consulta orari",
      description: canManageSettings ? "Settimana di apertura" : "Orari in sola lettura",
    },
    {
      segment: "publication" as const,
      label: canManageBusiness ? "Gestisci pubblicazione" : "Controlla readiness",
      description: canManageBusiness ? "Requisiti e visibilità" : "Stato in sola lettura",
    },
    ...(canManageBusiness
      ? [
          {
            segment: "inquiries" as const,
            label: "Richieste ricevute",
            description: inquirySummary,
          },
        ]
      : []),
    {
      segment: "modules" as const,
      label: canManageModules ? "Configura moduli" : "Consulta moduli",
      description: canManageModules ? "Funzioni dell’attività" : "Moduli in sola lettura",
    },
    ...(hasCatalog && canManageBusiness
      ? [
          {
            segment: "orders" as const,
            label: "Ordini di ritiro",
            description: "Configurazione e ordini ricevuti",
          },
        ]
      : []),
  ];

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
            <strong>{primaryModuleLabel}</strong>
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
              ? canCompleteNextAction
                ? "CityCore ha individuato il primo requisito da completare. Salva i dati e torna qui per continuare."
                : "Il requisito richiede un ruolo con permessi di gestione. Puoi consultare i dati e segnalarlo all’amministratore."
              : isPublic
                ? "La scheda è pubblica e può ricevere richieste dagli utenti."
                : business.status === "active"
                  ? "La scheda è pronta, ma sarà visibile solo quando la città sarà pubblica."
                  : "La checklist è completa: controlla il riepilogo e pubblica la scheda."}
          </p>
          {nextAction?.href && canCompleteNextAction ? (
            <Link className="admin-button form-button" href={nextAction.href}>
              {nextAction.label} →
            </Link>
          ) : nextAction ? (
            <span className="admin-muted-label">
              {canCompleteNextAction
                ? nextAction.label
                : "Serve un amministratore con permessi di gestione"}
            </span>
          ) : (
            <Link
              className="admin-button form-button"
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
          <p className="section-label">Aree di lavoro</p>
          <h2 id="business-quick-title">Scegli dove continuare</h2>
        </div>
        <div className="admin-quick-grid business-quick-grid">
          {quickActions.map(({ segment, label, description }) => (
            <Link
              className="admin-quick-card"
              href={businessAdminSectionPath(citySlug, businessSlug, segment)}
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
