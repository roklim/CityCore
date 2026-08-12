import Link from "next/link";
import { AdminCollectionError } from "../../../../../components/admin-collection-state";
import { AdminStatusBadge } from "../../../../../components/admin-status-badge";
import { AdminSubmitButton } from "../../../../../components/admin-submit-button";
import { businessAdminSectionPath } from "../../../../../lib/business-admin-navigation";
import { isBusinessPublic } from "../../../../../lib/business-visibility";
import {
  businessAdminApiPath,
  getBusinessAdminContext,
  loadBusinessAdminResponse,
} from "../../../../../lib/business-admin-server";
import {
  readinessAction,
  readinessReasonLabel,
  readinessRequirements,
  readinessSummary,
} from "../../../../../lib/business-admin-logic";
import type { PlatformPublishReadinessResponse } from "../../../../../lib/platform-api";
import { publishBusinessAction, unpublishBusinessAction } from "../actions";

export const metadata = { title: "Pubblicazione attività" };

export default async function BusinessPublicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ citySlug: string; businessSlug: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { citySlug, businessSlug } = await params;
  const feedback = await searchParams;
  const { session, business } = await getBusinessAdminContext(citySlug, businessSlug);
  const path = businessAdminSectionPath(citySlug, businessSlug, "publication");
  const readiness = await loadBusinessAdminResponse<PlatformPublishReadinessResponse>(
    `${businessAdminApiPath(citySlug, businessSlug)}/publish-readiness`,
    session.token,
  );
  const canManage = session.auth.activeAccess.permissions.includes("businesses.manage");
  const canManageCity = session.auth.activeAccess.permissions.includes("cities.manage");
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
      <section className="data-card business-publication-card" aria-labelledby="publication-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Visibilità</p>
            <h2 id="publication-title">
              {isPublic
                ? "Attività pubblicata"
                : business.status === "active"
                  ? "Attività pronta, città non pubblica"
                  : "Attività non pubblicata"}
            </h2>
          </div>
          <AdminStatusBadge status={business.status} />
        </div>
        {readiness.failed ? (
          <AdminCollectionError
            message="Non è stato possibile verificare i requisiti di pubblicazione."
            retryHref={path}
          />
        ) : (
          <>
            <div
              className={`business-readiness-summary${readiness.data.item.canPublish ? " is-ready" : ""}`}
            >
              <strong>{readinessSummary(readiness.data.item)}</strong>
              <span>
                {readiness.data.item.canPublish
                  ? "Tutti i requisiti richiesti sono soddisfatti."
                  : `${readiness.data.item.missingRequirements.length} requisiti mancanti`}
              </span>
            </div>
            <ul className="business-readiness-list">
              {readinessRequirements.map(([key, label]) => {
                const missing = readiness.data.item.missingRequirements.includes(key);
                const action = readinessAction(key, citySlug, businessSlug, canManageCity);
                return (
                  <li className={missing ? "is-missing" : "is-complete"} key={key}>
                    <span aria-hidden="true">{missing ? "×" : "✓"}</span>
                    <div>
                      <strong>{label}</strong>
                      {missing ? <small>{readinessReasonLabel(key)}</small> : null}
                      {missing && action.href ? (
                        <Link className="table-link" href={action.href}>
                          {action.label} →
                        </Link>
                      ) : missing ? (
                        <small>{action.label}</small>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            {readiness.data.item.warnings.length ? (
              <div className="admin-state-card">
                <strong>Indicazioni utili</strong>
                <p>Configura un telefono o un’email pubblica per offrire un contatto diretto.</p>
              </div>
            ) : null}
            <div className="business-publication-actions">
              {canManage && business.status === "draft" ? (
                <form action={publishBusinessAction}>
                  <input name="citySlug" type="hidden" value={citySlug} />
                  <input name="businessSlug" type="hidden" value={businessSlug} />
                  <input name="returnTo" type="hidden" value={path} />
                  {readiness.data.item.canPublish ? (
                    <AdminSubmitButton pendingLabel="Pubblicazione…">
                      Pubblica attività
                    </AdminSubmitButton>
                  ) : (
                    <button className="form-button" disabled type="submit">
                      Pubblica attività
                    </button>
                  )}
                </form>
              ) : null}
              {canManage && business.status === "active" ? (
                <form action={unpublishBusinessAction}>
                  <input name="citySlug" type="hidden" value={citySlug} />
                  <input name="businessSlug" type="hidden" value={businessSlug} />
                  <input name="returnTo" type="hidden" value={path} />
                  <AdminSubmitButton
                    className="ghost-button danger-button"
                    pendingLabel="Rimozione…"
                  >
                    Rimuovi dalla pubblicazione
                  </AdminSubmitButton>
                </form>
              ) : null}
              {isPublic ? (
                <Link
                  className="ghost-button"
                  href={`/${encodeURIComponent(citySlug)}/${encodeURIComponent(businessSlug)}`}
                >
                  Apri scheda pubblica →
                </Link>
              ) : null}
            </div>
            {business.status === "active" && !isPublic ? (
              <div className="admin-state-card">
                <strong>La città non è visibile al pubblico.</strong>
                <p>La scheda tornerà raggiungibile quando un amministratore riattiverà la città.</p>
              </div>
            ) : null}
            {business.status === "paused" || business.status === "disabled" ? (
              <div className="admin-state-card">
                <strong>Stato gestito dall&apos;amministrazione.</strong>
                <p>
                  Contatta un amministratore di città o piattaforma per verificare la sospensione; i
                  dati restano conservati.
                </p>
              </div>
            ) : null}
            {!canManage ? (
              <p className="muted-copy">
                Il tuo ruolo può consultare la readiness ma non cambiare la pubblicazione.
              </p>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}
