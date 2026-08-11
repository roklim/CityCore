import Link from "next/link";
import { AdminCollectionError, AdminEmptyState } from "../../../components/admin-collection-state";
import { AdminPagination } from "../../../components/admin-pagination";
import { AdminStatusBadge } from "../../../components/admin-status-badge";
import { AdminSubmitButton } from "../../../components/admin-submit-button";
import { PlatformAdminShell } from "../../../components/platform-admin-shell";
import { adminRoleLabel, adminScopeLabel } from "../../../lib/admin-labels";
import {
  positivePage,
  queryString,
  searchParam,
  type AdminSearchParams,
} from "../../../lib/admin-query";
import { loadAdminResponse, requirePlatformAdminSession } from "../../../lib/admin-server";
import {
  type PlatformAccessGrantsResponse,
  type PlatformBusinessesResponse,
  type PlatformCitiesResponse,
} from "../../../lib/platform-api";
import { toggleAccessGrantAction } from "../platform-actions";
import { AccessGrantForm } from "./access-grant-form";

export const metadata = { title: "Ruoli e accessi" };
type AccessPageProps = { searchParams: Promise<AdminSearchParams> };

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("it-IT", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Rome",
      }).format(new Date(value))
    : "Mai utilizzato";
}

export default async function AdminAccessPage({ searchParams }: AccessPageProps) {
  const params = await searchParams;
  const session = await requirePlatformAdminSession();
  const q = searchParam(params, "q");
  const role = searchParam(params, "role");
  const scope = searchParam(params, "scope");
  const active = searchParam(params, "active");
  const page = positivePage(searchParam(params, "page"));
  const notice = searchParam(params, "notice");
  const error = searchParam(params, "error");
  const query = { q, role, scopeType: scope, active, page, limit: 20 };
  const currentQuery = queryString({ q, role, scope, active, page: page > 1 ? page : undefined });
  const returnTo = currentQuery ? `/admin/access?${currentQuery}` : "/admin/access";
  const isPlatformScope = session.auth.activeAccess.scopeType === "platform";
  const canManageAccess = session.auth.activeAccess.permissions.includes("business_users.manage");

  const [accessGrants, cities, businesses] = await Promise.all([
    loadAdminResponse<PlatformAccessGrantsResponse>(
      `/api/v2/platform-core/access-grants?${queryString(query)}`,
      session.token,
    ),
    loadAdminResponse<PlatformCitiesResponse>(
      "/api/v2/platform-core/cities?page=1&limit=50",
      session.token,
    ),
    loadAdminResponse<PlatformBusinessesResponse>(
      "/api/v2/platform-core/businesses?page=1&limit=50",
      session.token,
    ),
  ]);

  return (
    <PlatformAdminShell
      breadcrumbs={[{ href: "/admin", label: "Dashboard" }, { label: "Accessi" }]}
      currentPath="/admin/access"
      description="Assegna ruoli coerenti con città e attività, quindi controlla stato e ultimo utilizzo dei grant."
      session={session}
      title="Ruoli e accessi"
    >
      {notice ? (
        <p className="surface-success" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="surface-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="admin-toolbar" aria-labelledby="access-filters-title">
        <div className="section-header">
          <p className="section-label">Ricerca e filtri</p>
          <h2 id="access-filters-title">Trova un accesso</h2>
        </div>
        <form className="admin-filter-form admin-filter-form-wide" method="get">
          <label className="field">
            <span>Utente o email</span>
            <input defaultValue={q} name="q" placeholder="nome@dominio.it" type="search" />
          </label>
          <label className="field">
            <span>Ruolo</span>
            <select defaultValue={role} name="role">
              <option value="">Tutti i ruoli</option>
              <option value="global_admin">Amministratore piattaforma</option>
              <option value="city_admin">Amministratore città</option>
              <option value="local_admin">Owner attività</option>
              <option value="staff">Staff attività</option>
            </select>
          </label>
          <label className="field">
            <span>Scope</span>
            <select defaultValue={scope} name="scope">
              <option value="">Tutti gli scope</option>
              <option value="platform">Piattaforma</option>
              <option value="city">Città</option>
              <option value="business">Attività</option>
            </select>
          </label>
          <label className="field">
            <span>Stato</span>
            <select defaultValue={active} name="active">
              <option value="">Tutti</option>
              <option value="true">Attivo</option>
              <option value="false">Disabilitato</option>
            </select>
          </label>
          <div className="admin-filter-actions">
            <button className="form-button" type="submit">
              Applica filtri
            </button>
            <Link className="ghost-button" href="/admin/access">
              Azzera
            </Link>
          </div>
        </form>
      </section>

      {canManageAccess && (isPlatformScope || cities.data?.items.length) ? (
        <details className="admin-create-panel">
          <summary>Assegna un accesso</summary>
          <AccessGrantForm
            businesses={businesses.data?.items ?? []}
            cities={cities.data?.items ?? []}
            isPlatformScope={isPlatformScope}
            returnTo={returnTo}
          />
        </details>
      ) : null}

      <section className="data-card" aria-labelledby="access-table-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Grant autorizzati</p>
            <h2 id="access-table-title">Accessi disponibili</h2>
          </div>
          {accessGrants.data ? (
            <span className="admin-result-count">{accessGrants.data.total} risultati</span>
          ) : null}
        </div>
        {accessGrants.failed ? (
          <AdminCollectionError
            message="Non è stato possibile caricare gli accessi."
            retryHref={returnTo}
          />
        ) : accessGrants.data.items.length ? (
          <>
            <div className="table-wrap" role="region" aria-label="Accessi autorizzati" tabIndex={0}>
              <table className="data-table admin-wide-table">
                <caption className="visually-hidden">Accessi autorizzati nel tuo ambito</caption>
                <thead>
                  <tr>
                    <th>Utente</th>
                    <th>Ruolo</th>
                    <th>Scope</th>
                    <th>Ambito</th>
                    <th>Ultimo utilizzo</th>
                    <th>Stato</th>
                    <th>Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {accessGrants.data.items.map((grant) => {
                    const isCurrent = grant.id === session.auth.activeAccess.id;
                    return (
                      <tr key={grant.id}>
                        <td>
                          <strong>{grant.user.name ?? grant.user.email}</strong>
                          <span>{grant.user.email}</span>
                        </td>
                        <td>{adminRoleLabel(grant.role)}</td>
                        <td>{adminScopeLabel(grant.scopeType)}</td>
                        <td>{grant.business?.name ?? grant.city?.name ?? "Piattaforma"}</td>
                        <td>{formatDate(grant.lastUsedAt)}</td>
                        <td>
                          <AdminStatusBadge status={grant.active ? "active" : "disabled"} />
                        </td>
                        <td>
                          {isCurrent ? (
                            <span className="admin-muted-label">Accesso corrente</span>
                          ) : canManageAccess ? (
                            <form action={toggleAccessGrantAction}>
                              <input name="returnTo" type="hidden" value={returnTo} />
                              <input name="accessGrantId" type="hidden" value={grant.id} />
                              <input
                                name="active"
                                type="hidden"
                                value={grant.active ? "false" : "true"}
                              />
                              <AdminSubmitButton
                                className="table-action-button"
                                pendingLabel="Aggiornamento…"
                              >
                                {grant.active ? "Disabilita" : "Riattiva"}
                              </AdminSubmitButton>
                            </form>
                          ) : (
                            <span className="admin-muted-label">Sola lettura</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <AdminPagination
              pathname="/admin/access"
              page={accessGrants.data.page}
              total={accessGrants.data.total}
              totalPages={accessGrants.data.totalPages}
              query={{ q, role, scope, active }}
            />
          </>
        ) : (
          <AdminEmptyState
            title="Nessun accesso trovato."
            text="Modifica i filtri oppure assegna un nuovo ruolo."
          />
        )}
      </section>
    </PlatformAdminShell>
  );
}
