import Link from "next/link";
import { AdminCollectionError, AdminEmptyState } from "../../../components/admin-collection-state";
import { AdminPagination } from "../../../components/admin-pagination";
import { AdminStatusBadge } from "../../../components/admin-status-badge";
import { AdminSubmitButton } from "../../../components/admin-submit-button";
import { PlatformAdminShell } from "../../../components/platform-admin-shell";
import {
  positivePage,
  queryString,
  searchParam,
  type AdminSearchParams,
} from "../../../lib/admin-query";
import { loadAdminResponse, requirePlatformAdminSession } from "../../../lib/admin-server";
import {
  type PlatformBusinessesResponse,
  type PlatformCitiesResponse,
  type PlatformTemplatesResponse,
} from "../../../lib/platform-api";
import { createBusinessAction } from "../platform-actions";

export const metadata = { title: "Gestione attività" };

type BusinessesPageProps = { searchParams: Promise<AdminSearchParams> };

export default async function AdminBusinessesPage({ searchParams }: BusinessesPageProps) {
  const params = await searchParams;
  const session = await requirePlatformAdminSession();
  const q = searchParam(params, "q");
  const city = searchParam(params, "city");
  const status = searchParam(params, "status");
  const template = searchParam(params, "template");
  const page = positivePage(searchParam(params, "page"));
  const notice = searchParam(params, "notice");
  const error = searchParam(params, "error");
  const query = { q, citySlug: city, status, templateCode: template, page, limit: 20 };
  const currentQuery = queryString({
    q,
    city,
    status,
    template,
    page: page > 1 ? page : undefined,
  });
  const returnTo = currentQuery ? `/admin/businesses?${currentQuery}` : "/admin/businesses";
  const canCreateBusiness = session.auth.activeAccess.permissions.includes("businesses.manage");

  const [businesses, cities, templates] = await Promise.all([
    loadAdminResponse<PlatformBusinessesResponse>(
      `/api/v2/platform-core/businesses?${queryString(query)}`,
      session.token,
    ),
    loadAdminResponse<PlatformCitiesResponse>(
      "/api/v2/platform-core/cities?page=1&limit=50",
      session.token,
    ),
    loadAdminResponse<PlatformTemplatesResponse>("/api/v2/platform-core/templates", session.token),
  ]);
  const activeTemplates = templates.data?.items.filter((item) => item.active) ?? [];

  return (
    <PlatformAdminShell
      breadcrumbs={[{ href: "/admin", label: "Dashboard" }, { label: "Attività" }]}
      currentPath="/admin/businesses"
      description="Cerca le attività del tuo scope, apri la gestione owner e controlla la visibilità pubblica."
      session={session}
      title="Attività"
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

      <section className="admin-toolbar" aria-labelledby="business-filters-title">
        <div className="section-header">
          <p className="section-label">Ricerca e filtri</p>
          <h2 id="business-filters-title">Trova un'attività</h2>
        </div>
        <form className="admin-filter-form admin-filter-form-wide" method="get">
          <label className="field">
            <span>Nome, slug o owner</span>
            <input defaultValue={q} name="q" placeholder="Es. Forno" type="search" />
          </label>
          <label className="field">
            <span>Città</span>
            <select defaultValue={city} name="city">
              <option value="">Tutte le città</option>
              {cities.data?.items.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Stato</span>
            <select defaultValue={status} name="status">
              <option value="">Tutti gli stati</option>
              <option value="active">Pubblicato</option>
              <option value="draft">Bozza</option>
              <option value="paused">In pausa</option>
              <option value="disabled">Disabilitato</option>
            </select>
          </label>
          <label className="field">
            <span>Template</span>
            <select defaultValue={template} name="template">
              <option value="">Tutti i template</option>
              {templates.data?.items.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="admin-filter-actions">
            <button className="form-button" type="submit">
              Applica filtri
            </button>
            <Link className="ghost-button" href="/admin/businesses">
              Azzera
            </Link>
          </div>
        </form>
      </section>

      {canCreateBusiness && cities.data?.items.length && activeTemplates.length ? (
        <details className="admin-create-panel">
          <summary>Nuova attività</summary>
          <form action={createBusinessAction} className="admin-edit-form">
            <input name="returnTo" type="hidden" value={returnTo} />
            <label className="field">
              <span>Nome attività</span>
              <input minLength={2} name="name" required />
            </label>
            <label className="field">
              <span>Slug (facoltativo)</span>
              <input name="slug" />
            </label>
            <label className="field">
              <span>Città</span>
              <select name="citySlug" required defaultValue={city}>
                <option disabled value="">
                  Seleziona città
                </option>
                {cities.data.items.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Template</span>
              <select name="templateCode" required defaultValue={activeTemplates[0]?.code}>
                {activeTemplates.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Email pubblica</span>
              <input name="publicEmail" type="email" />
            </label>
            <label className="field">
              <span>Telefono pubblico</span>
              <input name="publicPhone" />
            </label>
            <label className="field">
              <span>Email owner</span>
              <input name="ownerEmail" type="email" />
            </label>
            <label className="field">
              <span>Nome owner</span>
              <input name="ownerName" />
            </label>
            <p className="admin-form-note">
              La nuova attività viene creata in bozza. La pubblicazione resta disponibile soltanto
              dopo la readiness.
            </p>
            <AdminSubmitButton pendingLabel="Creazione…">Crea attività</AdminSubmitButton>
          </form>
        </details>
      ) : null}

      <section className="data-card" aria-labelledby="business-table-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Directory amministrativa</p>
            <h2 id="business-table-title">Attività disponibili</h2>
          </div>
          {businesses.data ? (
            <span className="admin-result-count">{businesses.data.total} risultati</span>
          ) : null}
        </div>
        {businesses.failed ? (
          <AdminCollectionError
            message="Non è stato possibile caricare le attività."
            retryHref={returnTo}
          />
        ) : businesses.data.items.length ? (
          <>
            <div
              className="table-wrap"
              role="region"
              aria-label="Attività disponibili"
              tabIndex={0}
            >
              <table className="data-table admin-wide-table">
                <caption className="visually-hidden">Attività disponibili nel tuo ambito</caption>
                <thead>
                  <tr>
                    <th>Attività</th>
                    <th>Città</th>
                    <th>Template</th>
                    <th>Owner</th>
                    <th>Stato</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.data.items.map((business) => (
                    <tr key={business.id}>
                      <td>
                        <strong>{business.name}</strong>
                        <span>{business.slug}</span>
                      </td>
                      <td>
                        {business.city.name}
                        <span>{business.city.slug}</span>
                      </td>
                      <td>
                        {business.template.name}
                        <span>{business.template.code}</span>
                      </td>
                      <td>
                        {business.owner?.name ?? business.owner?.email ?? "Non assegnato"}
                        {business.owner?.name ? <span>{business.owner.email}</span> : null}
                      </td>
                      <td>
                        <AdminStatusBadge status={business.status} />
                      </td>
                      <td>
                        <div className="table-actions">
                          <Link
                            className="table-link"
                            href={`/${business.city.slug}/${business.slug}/admin`}
                          >
                            Gestisci
                          </Link>
                          {business.status === "active" ? (
                            <Link
                              className="table-link"
                              href={`/${business.city.slug}/${business.slug}`}
                            >
                              Apri pagina pubblica
                            </Link>
                          ) : (
                            <span className="admin-muted-label">Non pubblicato</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              pathname="/admin/businesses"
              page={businesses.data.page}
              total={businesses.data.total}
              totalPages={businesses.data.totalPages}
              query={{ q, city, status, template }}
            />
          </>
        ) : (
          <AdminEmptyState
            title="Nessuna attività corrisponde ai filtri."
            text="Modifica la ricerca oppure crea una nuova attività."
          />
        )}
      </section>
    </PlatformAdminShell>
  );
}
