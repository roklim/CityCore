import Link from "next/link";
import { AdminCollectionError, AdminEmptyState } from "../../components/admin-collection-state";
import { PlatformAdminShell } from "../../components/platform-admin-shell";
import { auditActionLabel } from "../../lib/admin-labels";
import { loadAdminResponse, requirePlatformAdminSession } from "../../lib/admin-server";
import {
  type PlatformAccessGrantsResponse,
  type PlatformAuditLogsResponse,
  type PlatformBusinessesResponse,
  type PlatformCitiesResponse,
} from "../../lib/platform-api";

export const metadata = { title: "Dashboard amministrativa" };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

export default async function AdminPage() {
  const session = await requirePlatformAdminSession();
  const [activeCities, publishedBusinesses, draftBusinesses, activeGrants, recentAudit] =
    await Promise.all([
      loadAdminResponse<PlatformCitiesResponse>(
        "/api/v2/platform-core/cities?status=active&active=true&page=1&limit=1",
        session.token,
      ),
      loadAdminResponse<PlatformBusinessesResponse>(
        "/api/v2/platform-core/businesses?status=active&page=1&limit=1",
        session.token,
      ),
      loadAdminResponse<PlatformBusinessesResponse>(
        "/api/v2/platform-core/businesses?status=draft&page=1&limit=1",
        session.token,
      ),
      loadAdminResponse<PlatformAccessGrantsResponse>(
        "/api/v2/platform-core/access-grants?active=true&page=1&limit=1",
        session.token,
      ),
      loadAdminResponse<PlatformAuditLogsResponse>(
        "/api/v2/platform-core/audit-logs?page=1&limit=5",
        session.token,
      ),
    ]);

  const hasLoadError = [activeCities, publishedBusinesses, draftBusinesses, activeGrants].some(
    (state) => state.failed,
  );

  return (
    <PlatformAdminShell
      breadcrumbs={[{ label: "Dashboard" }]}
      currentPath="/admin"
      description="Una vista sintetica dello stato della piattaforma e degli ambiti che puoi amministrare."
      session={session}
      title="Dashboard"
    >
      {hasLoadError ? (
        <AdminCollectionError
          message="Non è stato possibile aggiornare tutti gli indicatori."
          retryHref="/admin"
        />
      ) : null}

      <section aria-labelledby="admin-kpi-title">
        <div className="section-header admin-section-heading">
          <div>
            <p className="section-label">Stato corrente</p>
            <h2 id="admin-kpi-title">Indicatori principali</h2>
          </div>
        </div>
        <div className="stats-grid admin-kpi-grid">
          <article className="metric-card">
            <span>Città attive</span>
            <strong>{activeCities.data?.total ?? "—"}</strong>
            <Link href="/admin/cities?status=active">Gestisci città</Link>
          </article>
          <article className="metric-card">
            <span>Attività pubblicate</span>
            <strong>{publishedBusinesses.data?.total ?? "—"}</strong>
            <Link href="/admin/businesses?status=active">Vedi pubblicate</Link>
          </article>
          <article className="metric-card">
            <span>Attività in bozza</span>
            <strong>{draftBusinesses.data?.total ?? "—"}</strong>
            <Link href="/admin/businesses?status=draft">Completa le bozze</Link>
          </article>
          <article className="metric-card">
            <span>Accessi attivi</span>
            <strong>{activeGrants.data?.total ?? "—"}</strong>
            <Link href="/admin/access?active=true">Gestisci accessi</Link>
          </article>
        </div>
      </section>

      <section aria-labelledby="quick-actions-title">
        <div className="section-header">
          <p className="section-label">Azioni rapide</p>
          <h2 id="quick-actions-title">Scegli cosa amministrare</h2>
        </div>
        <div className="admin-quick-grid">
          <Link className="admin-quick-card" href="/admin/cities">
            <span>Città</span>
            <strong>Gestisci città</strong>
            <p>Registry, stato e pagine cittadine.</p>
          </Link>
          <Link className="admin-quick-card" href="/admin/businesses">
            <span>Attività</span>
            <strong>Gestisci attività</strong>
            <p>Owner, template e pubblicazione.</p>
          </Link>
          <Link className="admin-quick-card" href="/admin/access">
            <span>Permessi</span>
            <strong>Ruoli e accessi</strong>
            <p>Grant attivi e ambiti operativi.</p>
          </Link>
          <Link className="admin-quick-card" href="/admin/audit">
            <span>Tracciabilità</span>
            <strong>Registro attività</strong>
            <p>Azioni recenti e controlli.</p>
          </Link>
        </div>
      </section>

      <section className="data-card" aria-labelledby="recent-audit-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Attività recente</p>
            <h2 id="recent-audit-title">Ultime azioni</h2>
          </div>
          <Link className="table-link" href="/admin/audit">
            Vedi registro completo
          </Link>
        </div>
        {recentAudit.failed ? (
          <AdminCollectionError
            message="Non è stato possibile caricare le attività recenti."
            retryHref="/admin"
          />
        ) : recentAudit.data.items.length ? (
          <div className="table-wrap" role="region" aria-label="Ultime attività" tabIndex={0}>
            <table className="data-table">
              <caption className="visually-hidden">Ultime cinque attività amministrative</caption>
              <thead>
                <tr>
                  <th>Azione</th>
                  <th>Attore</th>
                  <th>Ambito</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {recentAudit.data.items.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <strong>{auditActionLabel(log.action)}</strong>
                      <span>{log.action}</span>
                    </td>
                    <td>{log.actorUser?.email ?? "Sistema"}</td>
                    <td>{log.business?.name ?? log.city?.name ?? "Piattaforma"}</td>
                    <td>{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState title="Non ci sono ancora attività registrate." />
        )}
      </section>
    </PlatformAdminShell>
  );
}
