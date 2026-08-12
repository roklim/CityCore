import Link from "next/link";
import { AdminCollectionError, AdminEmptyState } from "../../../components/admin-collection-state";
import { AdminPagination } from "../../../components/admin-pagination";
import { AdminStatusBadge } from "../../../components/admin-status-badge";
import { PlatformAdminShell } from "../../../components/platform-admin-shell";
import { isBusinessPublic } from "../../../lib/business-visibility";
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
import { BusinessCreateForm } from "./business-create-form";

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
  const activeCities =
    cities.data?.items.filter((item) => item.active && item.status === "active") ?? [];
  const readyCities = activeCities.filter((item) => item.activeCategoryCount > 0);
  const citiesWithoutCategories = activeCities.filter((item) => item.activeCategoryCount === 0);
  const defaultCity = readyCities.some((item) => item.slug === city) ? city : "";

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

      <section className="admin-state-card" aria-labelledby="business-flow-title">
        <div>
          <p className="section-label">Percorso guidato</p>
          <h2 id="business-flow-title">Crea in bozza, completa, pubblica</h2>
        </div>
        <p>
          Per creare un'attività serve una città pubblica con almeno una categoria attiva. Dopo la
          creazione troverai una checklist con il prossimo passaggio da completare.
        </p>
        <div className="admin-filter-actions">
          <Link className="ghost-button" href="/admin/cities">
            Configura città e categorie
          </Link>
        </div>
      </section>

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

      {canCreateBusiness && readyCities.length && activeTemplates.length ? (
        <details className="admin-create-panel">
          <summary>Nuova attività in una città pronta</summary>
          <BusinessCreateForm
            cities={readyCities}
            defaultCity={defaultCity}
            returnTo={returnTo}
            templates={activeTemplates}
          />
        </details>
      ) : canCreateBusiness ? (
        <section
          className="admin-state-card is-error"
          aria-labelledby="business-prerequisites-title"
        >
          <div>
            <p className="section-label">Prima di creare un'attività</p>
            <h2 id="business-prerequisites-title">Completa i prerequisiti</h2>
          </div>
          <p>
            {!activeCities.length
              ? "Non ci sono città pubbliche. Attiva una città per proseguire."
              : !activeTemplates.length
                ? "Non ci sono template attivi disponibili."
                : "Le città attive non hanno ancora categorie disponibili."}
          </p>
          {citiesWithoutCategories.length ? (
            <div className="admin-filter-actions">
              {citiesWithoutCategories.map((item) => (
                <Link
                  className="ghost-button"
                  href={`/admin/cities/${encodeURIComponent(item.slug)}/categories`}
                  key={item.id}
                >
                  Crea categorie per {item.name}
                </Link>
              ))}
            </div>
          ) : (
            <Link className="ghost-button" href="/admin/cities">
              Vai alle città
            </Link>
          )}
        </section>
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
                            Continua configurazione
                          </Link>
                          {isBusinessPublic(business) ? (
                            <Link
                              className="table-link"
                              href={`/${business.city.slug}/${business.slug}`}
                            >
                              Apri pagina pubblica
                            </Link>
                          ) : (
                            <span className="admin-muted-label">
                              {business.status === "active"
                                ? "Città non pubblica"
                                : "Non pubblicato"}
                            </span>
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
