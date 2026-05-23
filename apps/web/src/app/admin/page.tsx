import { redirect } from "next/navigation";
import { AdminShell } from "../../components/admin-shell";
import { logoutAction } from "./actions";
import {
  type PlatformAuditLog,
  fetchPlatformApi,
  type PlatformAccessGrant,
  type PlatformBusiness,
  type PlatformCity,
  type PlatformCityRegistryEntry,
  PlatformApiError,
} from "../../lib/platform-api";
import { getWebSession } from "../../lib/web-session";

export const metadata = {
  title: "Global Admin",
};

type CollectionState<TItem> = {
  items: TItem[];
  error: string | null;
};

async function loadCollection<TItem>(request: Promise<{ status: string; items: TItem[] }>) {
  try {
    const response = await request;

    return {
      items: response.items,
      error: null,
    } satisfies CollectionState<TItem>;
  } catch (error) {
    const message =
      error instanceof PlatformApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Errore sconosciuto";

    return {
      items: [],
      error: message,
    } satisfies CollectionState<TItem>;
  }
}

function formatScopeLabel(scope: {
  scopeType: "platform" | "city" | "business";
  city: { slug: string } | null;
  business: { slug: string } | null;
}) {
  if (scope.scopeType === "platform") {
    return "Platform";
  }

  if (scope.scopeType === "city") {
    return scope.city?.slug ?? "city";
  }

  return scope.business?.slug ?? "business";
}

export default async function AdminPage() {
  const session = await getWebSession();

  if (!session) {
    redirect("/admin/login");
  }

  if (session.auth.activeAccess.scopeType === "business") {
    redirect(session.auth.redirectTo || "/admin/login");
  }

  const [registry, cities, businesses, accessGrants, auditLogs] = await Promise.all([
    loadCollection<PlatformCityRegistryEntry>(
      fetchPlatformApi("/api/v2/platform-core/city-registry?limit=8", {
        token: session.token,
        cache: "no-store",
      }),
    ),
    loadCollection<PlatformCity>(
      fetchPlatformApi("/api/v2/platform-core/cities?limit=8", {
        token: session.token,
        cache: "no-store",
      }),
    ),
    loadCollection<PlatformBusiness>(
      fetchPlatformApi("/api/v2/platform-core/businesses?limit=8", {
        token: session.token,
        cache: "no-store",
      }),
    ),
    loadCollection<PlatformAccessGrant>(
      fetchPlatformApi("/api/v2/platform-core/access-grants?limit=8", {
        token: session.token,
        cache: "no-store",
      }),
    ),
    loadCollection<PlatformAuditLog>(
      fetchPlatformApi("/api/v2/platform-core/audit-logs?limit=8", {
        token: session.token,
        cache: "no-store",
      }),
    ),
  ]);

  const totalRegistryLinked = registry.items.filter((item) => item.linkedCity != null).length;
  const totalActiveCities = cities.items.filter((item) => item.status === "active").length;
  const totalDraftBusinesses = businesses.items.filter((item) => item.status === "draft").length;
  const totalActiveGrants = accessGrants.items.filter((item) => item.active).length;

  return (
    <AdminShell
      activeSection="global_admin"
      eyebrow="CityCore surface"
      title="Global Admin console"
      description="Questa superficie usa sessione reale e legge direttamente il Platform Core Fastify: city registry, cities, businesses e access grants arrivano tutti dalla piattaforma attiva."
      routePath="/admin"
      statusLabel={session.auth.activeAccess.role.replaceAll("_", " ")}
      asideTitle="Sessione attiva"
      asideText={`Utente: ${session.auth.user.email}. Scope: ${session.auth.activeAccess.scopeType}. Redirect piattaforma: ${session.auth.redirectTo}.`}
    >
      <section className="action-bar">
        <div className="inline-stack">
          <p className="section-label">Session</p>
          <strong>{session.auth.user.name ?? session.auth.user.email}</strong>
          <p className="muted-copy">
            Accesso attivo: {session.auth.activeAccess.role.replaceAll("_", " ")} su{" "}
            {formatScopeLabel(session.auth.activeAccess)}
          </p>
        </div>

        <form action={logoutAction}>
          <button className="ghost-button" type="submit">
            Logout
          </button>
        </form>
      </section>

      <section className="stats-grid">
        <article className="metric-card">
          <span>Registry collegate</span>
          <strong>{totalRegistryLinked}</strong>
          <p>
            {registry.error ? registry.error : "Comuni registry gia agganciati a una city attiva."}
          </p>
        </article>

        <article className="metric-card">
          <span>Citta attive</span>
          <strong>{totalActiveCities}</strong>
          <p>{cities.error ? cities.error : "Conteggio reale letto da /cities."}</p>
        </article>

        <article className="metric-card">
          <span>Business in bozza</span>
          <strong>{totalDraftBusinesses}</strong>
          <p>
            {businesses.error ? businesses.error : "Tenant reali letti dal core di piattaforma."}
          </p>
        </article>

        <article className="metric-card">
          <span>Access grant attivi</span>
          <strong>{totalActiveGrants}</strong>
          <p>
            {accessGrants.error ? accessGrants.error : "Permessi scoped serviti dalla nuova auth."}
          </p>
        </article>
      </section>

      <section className="data-grid">
        <article className="data-card">
          <div className="card-heading">
            <div>
              <p className="section-label">City Registry</p>
              <h2>Fonte municipale per onboarding</h2>
            </div>
            <code>/api/v2/platform-core/city-registry</code>
          </div>

          {registry.error ? <p className="surface-error">{registry.error}</p> : null}
          {!registry.error && registry.items.length === 0 ? (
            <p className="empty-copy">Nessun comune registry disponibile.</p>
          ) : null}

          {registry.items.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Comune</th>
                    <th>Provincia</th>
                    <th>Regione</th>
                    <th>Link city</th>
                  </tr>
                </thead>
                <tbody>
                  {registry.items.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <strong>{entry.name}</strong>
                        <span>{entry.slug}</span>
                      </td>
                      <td>{entry.provinceCode ?? "n/d"}</td>
                      <td>{entry.regionName ?? entry.regionCode ?? "n/d"}</td>
                      <td>
                        {entry.linkedCity
                          ? `${entry.linkedCity.slug} (${entry.linkedCity.status})`
                          : "non collegata"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>

        <article className="data-card">
          <div className="card-heading">
            <div>
              <p className="section-label">Cities</p>
              <h2>Citta lette dalla API di piattaforma</h2>
            </div>
            <code>/api/v2/platform-core/cities</code>
          </div>

          {cities.error ? <p className="surface-error">{cities.error}</p> : null}
          {!cities.error && cities.items.length === 0 ? (
            <p className="empty-copy">Nessuna citta disponibile nello scope attivo.</p>
          ) : null}

          {cities.items.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Citta</th>
                    <th>Stato</th>
                    <th>Regione</th>
                    <th>Business</th>
                  </tr>
                </thead>
                <tbody>
                  {cities.items.map((city) => (
                    <tr key={city.id}>
                      <td>
                        <strong>{city.name}</strong>
                        <span>{city.slug}</span>
                      </td>
                      <td>{city.status}</td>
                      <td>{city.region ?? "n/d"}</td>
                      <td>{city.businessCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>

        <article className="data-card">
          <div className="card-heading">
            <div>
              <p className="section-label">Businesses</p>
              <h2>Provisioning tenant gia leggibile</h2>
            </div>
            <code>/api/v2/platform-core/businesses</code>
          </div>

          {businesses.error ? <p className="surface-error">{businesses.error}</p> : null}
          {!businesses.error && businesses.items.length === 0 ? (
            <p className="empty-copy">Nessun business disponibile nello scope attivo.</p>
          ) : null}

          {businesses.items.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Template</th>
                    <th>Stato</th>
                    <th>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.items.map((business) => (
                    <tr key={business.id}>
                      <td>
                        <strong>{business.name}</strong>
                        <span>
                          {business.city.slug}/{business.slug}
                        </span>
                      </td>
                      <td>{business.template.code}</td>
                      <td>{business.status}</td>
                      <td>{business.owner?.email ?? "owner non assegnato"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>
      </section>

      <section className="data-card">
        <div className="card-heading">
          <div>
            <p className="section-label">Access Grants</p>
            <h2>Ruoli scoped serviti dalla nuova auth</h2>
          </div>
          <code>/api/v2/platform-core/access-grants</code>
        </div>

        {accessGrants.error ? <p className="surface-error">{accessGrants.error}</p> : null}
        {!accessGrants.error && accessGrants.items.length === 0 ? (
          <p className="empty-copy">Nessun access grant disponibile nello scope attivo.</p>
        ) : null}

        {accessGrants.items.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Utente</th>
                  <th>Ruolo</th>
                  <th>Scope</th>
                  <th>Ultimo uso</th>
                </tr>
              </thead>
              <tbody>
                {accessGrants.items.map((grant) => (
                  <tr key={grant.id}>
                    <td>
                      <strong>{grant.user.name ?? grant.user.email}</strong>
                      <span>{grant.user.email}</span>
                    </td>
                    <td>{grant.role}</td>
                    <td>{formatScopeLabel(grant)}</td>
                    <td>
                      {grant.lastUsedAt
                        ? new Date(grant.lastUsedAt).toLocaleString("it-IT")
                        : "mai"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="data-card">
        <div className="card-heading">
          <div>
            <p className="section-label">Audit Logs</p>
            <h2>Tracciabilita delle azioni sensibili</h2>
          </div>
          <code>/api/v2/platform-core/audit-logs</code>
        </div>

        {auditLogs.error ? <p className="surface-error">{auditLogs.error}</p> : null}
        {!auditLogs.error && auditLogs.items.length === 0 ? (
          <p className="empty-copy">Nessun audit log disponibile nello scope attivo.</p>
        ) : null}

        {auditLogs.items.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Azione</th>
                  <th>Attore</th>
                  <th>Scope</th>
                  <th>Quando</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.items.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <strong>{log.action}</strong>
                      <span>
                        {log.targetType}
                        {log.targetId ? `/${log.targetId}` : ""}
                      </span>
                    </td>
                    <td>{log.actorUser?.email ?? "sistema"}</td>
                    <td>
                      {log.business
                        ? `${log.business.city.slug}/${log.business.slug}`
                        : (log.city?.slug ?? log.scopeType)}
                    </td>
                    <td>{new Date(log.createdAt).toLocaleString("it-IT")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}
