import Link from "next/link";
import { AdminCollectionError, AdminEmptyState } from "../../../components/admin-collection-state";
import { AdminPagination } from "../../../components/admin-pagination";
import { PlatformAdminShell } from "../../../components/platform-admin-shell";
import { adminScopeLabel, auditActionLabel } from "../../../lib/admin-labels";
import {
  positivePage,
  queryString,
  searchParam,
  type AdminSearchParams,
} from "../../../lib/admin-query";
import { loadAdminResponse, requirePlatformAdminSession } from "../../../lib/admin-server";
import type { PlatformAuditLogsResponse } from "../../../lib/platform-api";

export const metadata = { title: "Registro attività" };
type AuditPageProps = { searchParams: Promise<AdminSearchParams> };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

export default async function AdminAuditPage({ searchParams }: AuditPageProps) {
  const params = await searchParams;
  const session = await requirePlatformAdminSession();
  const q = searchParam(params, "q");
  const action = searchParam(params, "action");
  const scope = searchParam(params, "scope");
  const from = searchParam(params, "from");
  const to = searchParam(params, "to");
  const page = positivePage(searchParam(params, "page"));
  const query = { q, action, scopeType: scope, from, to, page, limit: 20 };
  const currentQuery = queryString({
    q,
    action,
    scope,
    from,
    to,
    page: page > 1 ? page : undefined,
  });
  const returnTo = currentQuery ? `/admin/audit?${currentQuery}` : "/admin/audit";
  const auditLogs = await loadAdminResponse<PlatformAuditLogsResponse>(
    `/api/v2/platform-core/audit-logs?${queryString(query)}`,
    session.token,
  );

  return (
    <PlatformAdminShell
      breadcrumbs={[{ href: "/admin", label: "Dashboard" }, { label: "Registro attività" }]}
      currentPath="/admin/audit"
      description="Consulta le azioni sensibili del tuo scope con etichette leggibili e riferimenti tecnici secondari."
      session={session}
      title="Registro attività"
    >
      <section className="admin-toolbar" aria-labelledby="audit-filters-title">
        <div className="section-header">
          <p className="section-label">Ricerca e filtri</p>
          <h2 id="audit-filters-title">Filtra il registro</h2>
        </div>
        <form className="admin-filter-form admin-filter-form-wide" method="get">
          <label className="field">
            <span>Testo</span>
            <input defaultValue={q} name="q" placeholder="Attore, azione o target" type="search" />
          </label>
          <label className="field">
            <span>Azione tecnica</span>
            <input defaultValue={action} name="action" placeholder="business.published" />
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
            <span>Dal</span>
            <input defaultValue={from} name="from" type="date" />
          </label>
          <label className="field">
            <span>Al</span>
            <input defaultValue={to} name="to" type="date" />
          </label>
          <div className="admin-filter-actions">
            <button className="form-button" type="submit">
              Applica filtri
            </button>
            <Link className="ghost-button" href="/admin/audit">
              Azzera
            </Link>
          </div>
        </form>
      </section>

      <section className="data-card" aria-labelledby="audit-table-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Tracciabilità</p>
            <h2 id="audit-table-title">Azioni registrate</h2>
          </div>
          {auditLogs.data ? (
            <span className="admin-result-count">{auditLogs.data.total} eventi</span>
          ) : null}
        </div>
        {auditLogs.failed ? (
          <AdminCollectionError
            message="Non è stato possibile caricare il registro attività."
            retryHref={returnTo}
          />
        ) : auditLogs.data.items.length ? (
          <>
            <div className="table-wrap" role="region" aria-label="Registro attività" tabIndex={0}>
              <table className="data-table admin-wide-table">
                <caption className="visually-hidden">Azioni sensibili registrate</caption>
                <thead>
                  <tr>
                    <th>Azione</th>
                    <th>Attore</th>
                    <th>Scope</th>
                    <th>Target</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.data.items.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <strong>{auditActionLabel(log.action)}</strong>
                        <span>{log.action}</span>
                      </td>
                      <td>
                        {log.actorUser?.name ?? log.actorUser?.email ?? "Sistema"}
                        {log.actorUser?.name ? <span>{log.actorUser.email}</span> : null}
                      </td>
                      <td>
                        {adminScopeLabel(log.scopeType)}
                        <span>{log.business?.city.name ?? log.city?.name ?? "Piattaforma"}</span>
                      </td>
                      <td>
                        {log.business ? (
                          <Link
                            className="table-link"
                            href={`/${log.business.city.slug}/${log.business.slug}/admin`}
                          >
                            {log.business.name}
                          </Link>
                        ) : log.city ? (
                          <Link
                            className="table-link"
                            href={`/admin/cities?q=${encodeURIComponent(log.city.slug)}`}
                          >
                            {log.city.name}
                          </Link>
                        ) : (
                          <>
                            {log.targetType}
                            <span>{log.targetId ?? "—"}</span>
                          </>
                        )}
                      </td>
                      <td>{formatDate(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              pathname="/admin/audit"
              page={auditLogs.data.page}
              total={auditLogs.data.total}
              totalPages={auditLogs.data.totalPages}
              query={{ q, action, scope, from, to }}
            />
          </>
        ) : (
          <AdminEmptyState
            title="Nessuna attività corrisponde ai filtri."
            text="Amplia il periodo o rimuovi uno dei filtri."
          />
        )}
      </section>
    </PlatformAdminShell>
  );
}
