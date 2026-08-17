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

function auditMark(action: string) {
  const normalized = action.toLocaleLowerCase("it");
  if (normalized.includes("city")) return "CI";
  if (normalized.includes("business")) return "AT";
  if (normalized.includes("access") || normalized.includes("user")) return "AC";
  return "AU";
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
  const draftCount = draftBusinesses.data?.total ?? 0;
  const hasDrafts = draftCount > 0;

  const metrics = [
    {
      label: "Città attive",
      value: activeCities.data?.total ?? "—",
      href: "/admin/cities?status=active&active=true",
      action: "Apri città",
    },
    {
      label: "Attività online",
      value: publishedBusinesses.data?.total ?? "—",
      href: "/admin/businesses?status=active",
      action: "Vedi attività",
    },
    {
      label: "In lavorazione",
      value: draftBusinesses.data?.total ?? "—",
      href: "/admin/businesses?status=draft",
      action: "Apri bozze",
    },
    {
      label: "Accessi attivi",
      value: activeGrants.data?.total ?? "—",
      href: "/admin/access?active=true",
      action: "Gestisci accessi",
    },
  ];

  const commands = [
    {
      mark: "CI",
      label: "Città",
      title: "Gestisci territori",
      description: "Registro territoriale, stato pubblico e categorie cittadine.",
      href: "/admin/cities",
    },
    {
      mark: "AT",
      label: "Attività",
      title: "Gestisci attività",
      description: "Owner, configurazione, stato e pubblicazione delle schede locali.",
      href: "/admin/businesses",
    },
    {
      mark: "AC",
      label: "Accessi",
      title: "Ruoli e permessi",
      description: "Controlla chi può operare e all'interno di quale ambito.",
      href: "/admin/access",
    },
    {
      mark: "AU",
      label: "Audit",
      title: "Registro attività",
      description: "Ricostruisci le operazioni recenti e verifica le modifiche.",
      href: "/admin/audit",
    },
  ];

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

      <section className="premium-dashboard-overview" aria-labelledby="platform-focus-title">
        <article
          className={`premium-dashboard-focus${hasDrafts ? " needs-attention" : " is-clear"}`}
        >
          <div className="premium-dashboard-focus-copy">
            <p className="section-label">Priorità operativa</p>
            <h2 id="platform-focus-title">
              {hasDrafts
                ? `${draftCount} ${draftCount === 1 ? "attività richiede" : "attività richiedono"} attenzione`
                : "La piattaforma è allineata"}
            </h2>
            <p>
              {hasDrafts
                ? "Completa le schede in bozza prima di ampliare la rete pubblica. CityCore mantiene il lavoro incompleto in primo piano."
                : "Non risultano attività in bozza. Puoi continuare ad ampliare la rete o controllare le operazioni recenti."}
            </p>
          </div>
          <div className="premium-dashboard-focus-action">
            <span className="premium-dashboard-focus-count" aria-hidden="true">
              {hasDrafts ? draftCount : "✓"}
            </span>
            <Link
              className="admin-button form-button"
              href={hasDrafts ? "/admin/businesses?status=draft" : "/admin/businesses"}
            >
              {hasDrafts ? "Apri attività in bozza" : "Gestisci attività"} →
            </Link>
          </div>
        </article>

        <dl
          className="premium-dashboard-metrics"
          aria-label="Indicatori principali della piattaforma"
        >
          {metrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>
                <strong>{metric.value}</strong>
                <Link href={metric.href}>{metric.action}</Link>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="premium-dashboard-section" aria-labelledby="platform-workspace-title">
        <div className="section-header premium-dashboard-heading">
          <div>
            <p className="section-label">Control center</p>
            <h2 id="platform-workspace-title">Aree di gestione</h2>
          </div>
          <p>Le funzioni principali della piattaforma, ordinate per ambito operativo.</p>
        </div>

        <div className="premium-command-grid">
          {commands.map((command) => (
            <Link className="premium-command-card" href={command.href} key={command.href}>
              <span className="premium-command-mark" aria-hidden="true">
                {command.mark}
              </span>
              <span className="premium-command-copy">
                <small>{command.label}</small>
                <strong>{command.title}</strong>
                <span>{command.description}</span>
              </span>
              <span className="premium-command-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="premium-activity-panel" aria-labelledby="recent-audit-title">
        <div className="card-heading premium-dashboard-heading">
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
          <ol className="premium-activity-feed" aria-label="Ultime cinque attività amministrative">
            {recentAudit.data.items.map((log) => (
              <li key={log.id}>
                <span className="premium-activity-mark" aria-hidden="true">
                  {auditMark(log.action)}
                </span>
                <div className="premium-activity-copy">
                  <strong>{auditActionLabel(log.action)}</strong>
                  <span>
                    {log.business?.name ?? log.city?.name ?? "Piattaforma"} ·{" "}
                    {log.actorUser?.email ?? "Sistema"}
                  </span>
                </div>
                <time dateTime={log.createdAt}>{formatDate(log.createdAt)}</time>
              </li>
            ))}
          </ol>
        ) : (
          <AdminEmptyState title="Non ci sono ancora attività registrate." />
        )}
      </section>
    </PlatformAdminShell>
  );
}
