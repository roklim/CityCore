import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "../../components/admin-shell";
import { AdminSubmitButton } from "../../components/admin-submit-button";
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
  title: "Area operatori",
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
      eyebrow="Area operatori"
      title="Gestione della piattaforma"
      description="Questa area è riservata agli operatori autorizzati. I dati di città, attività e permessi arrivano dalla piattaforma attiva."
      routePath="/admin"
      navigationItems={[
        { href: "/", label: "Home pubblica", meta: "Scegli una città" },
        {
          href: "/admin",
          label: "Console piattaforma",
          meta: "Città, attività e accessi",
          current: true,
        },
        ...(session.auth.accesses.length > 1
          ? [
              {
                href: "/select-access",
                label: "Cambia accesso",
                meta: "Scegli ruolo e ambito",
              },
            ]
          : []),
      ]}
      statusLabel={`Area operatori · ${session.auth.activeAccess.role.replaceAll("_", " ")}`}
      asideTitle="Sessione attiva"
      asideText={`Utente: ${session.auth.user.email}. Ambito: ${session.auth.activeAccess.scopeType}.`}
      headerActions={
        <>
          {session.auth.accesses.length > 1 ? (
            <Link className="ghost-button" href="/select-access">
              Cambia accesso
            </Link>
          ) : null}
          <form action={logoutAction} className="operator-session-form">
            <AdminSubmitButton className="ghost-button" pendingLabel="Uscita…">
              Esci
            </AdminSubmitButton>
          </form>
        </>
      }
    >
      <section className="action-bar">
        <div className="inline-stack">
          <p className="section-label">Sessione</p>
          <strong>{session.auth.user.name ?? session.auth.user.email}</strong>
          <p className="muted-copy">
            Accesso attivo: {session.auth.activeAccess.role.replaceAll("_", " ")} su{" "}
            {formatScopeLabel(session.auth.activeAccess)}
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <article className="metric-card">
          <span>Registry collegate</span>
          <strong>{totalRegistryLinked}</strong>
          <p>{registry.error ? registry.error : "Comuni già collegati a una città attiva."}</p>
        </article>

        <article className="metric-card">
          <span>Città attive</span>
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
            <div className="table-wrap" role="region" aria-label="Comuni del registro" tabIndex={0}>
              <table className="data-table">
                <caption className="visually-hidden">Comuni disponibili nel registro</caption>
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
                        {entry.linkedCity ? (
                          <Link className="table-link" href={`/${entry.linkedCity.slug}`}>
                            {entry.linkedCity.slug} ({entry.linkedCity.status})
                          </Link>
                        ) : (
                          "non collegata"
                        )}
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
              <h2>Città lette dalla API di piattaforma</h2>
            </div>
            <code>/api/v2/platform-core/cities</code>
          </div>

          {cities.error ? <p className="surface-error">{cities.error}</p> : null}
          {!cities.error && cities.items.length === 0 ? (
            <p className="empty-copy">Nessuna città disponibile nell'ambito attivo.</p>
          ) : null}

          {cities.items.length > 0 ? (
            <div className="table-wrap" role="region" aria-label="Città disponibili" tabIndex={0}>
              <table className="data-table">
                <caption className="visually-hidden">Città disponibili nella piattaforma</caption>
                <thead>
                  <tr>
                    <th>Città</th>
                    <th>Stato</th>
                    <th>Regione</th>
                    <th>Business</th>
                  </tr>
                </thead>
                <tbody>
                  {cities.items.map((city) => (
                    <tr key={city.id}>
                      <td>
                        <strong>
                          <Link className="table-link" href={`/${city.slug}`}>
                            {city.name}
                          </Link>
                        </strong>
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
              <h2>Attività disponibili nella piattaforma</h2>
            </div>
            <code>/api/v2/platform-core/businesses</code>
          </div>

          {businesses.error ? <p className="surface-error">{businesses.error}</p> : null}
          {!businesses.error && businesses.items.length === 0 ? (
            <p className="empty-copy">Nessuna attività disponibile nell'ambito attivo.</p>
          ) : null}

          {businesses.items.length > 0 ? (
            <div
              className="table-wrap"
              role="region"
              aria-label="Attività disponibili"
              tabIndex={0}
            >
              <table className="data-table">
                <caption className="visually-hidden">
                  Attività disponibili nella piattaforma
                </caption>
                <thead>
                  <tr>
                    <th>Attività</th>
                    <th>Template</th>
                    <th>Stato</th>
                    <th>Owner</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.items.map((business) => (
                    <tr key={business.id}>
                      <td>
                        <strong>
                          <Link
                            className="table-link"
                            href={`/${business.city.slug}/${business.slug}`}
                          >
                            {business.name}
                          </Link>
                        </strong>
                        <span>
                          {business.city.slug}/{business.slug}
                        </span>
                      </td>
                      <td>{business.template.code}</td>
                      <td>{business.status}</td>
                      <td>{business.owner?.email ?? "owner non assegnato"}</td>
                      <td>
                        <div className="table-actions">
                          <Link
                            className="table-link"
                            href={`/${business.city.slug}/${business.slug}`}
                          >
                            Scheda
                          </Link>
                          <Link
                            className="table-link"
                            href={`/${business.city.slug}/${business.slug}/admin`}
                          >
                            Gestisci
                          </Link>
                        </div>
                      </td>
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
            <p className="section-label">Accessi</p>
            <h2>Ruoli e ambiti autorizzati</h2>
          </div>
          <code>/api/v2/platform-core/access-grants</code>
        </div>

        {accessGrants.error ? <p className="surface-error">{accessGrants.error}</p> : null}
        {!accessGrants.error && accessGrants.items.length === 0 ? (
          <p className="empty-copy">Nessun accesso disponibile nell'ambito attivo.</p>
        ) : null}

        {accessGrants.items.length > 0 ? (
          <div className="table-wrap" role="region" aria-label="Accessi autorizzati" tabIndex={0}>
            <table className="data-table">
              <caption className="visually-hidden">Accessi autorizzati nella piattaforma</caption>
              <thead>
                <tr>
                  <th>Utente</th>
                  <th>Ruolo</th>
                  <th>Ambito</th>
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
            <p className="section-label">Registro attività</p>
            <h2>Tracciabilità delle azioni sensibili</h2>
          </div>
          <code>/api/v2/platform-core/audit-logs</code>
        </div>

        {auditLogs.error ? <p className="surface-error">{auditLogs.error}</p> : null}
        {!auditLogs.error && auditLogs.items.length === 0 ? (
          <p className="empty-copy">Nessun evento disponibile nell'ambito attivo.</p>
        ) : null}

        {auditLogs.items.length > 0 ? (
          <div className="table-wrap" role="region" aria-label="Registro attività" tabIndex={0}>
            <table className="data-table">
              <caption className="visually-hidden">Registro delle azioni sensibili</caption>
              <thead>
                <tr>
                  <th>Azione</th>
                  <th>Attore</th>
                  <th>Ambito</th>
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
