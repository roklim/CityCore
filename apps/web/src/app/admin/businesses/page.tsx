import Link from "next/link";
import { AdminCollectionError, AdminEmptyState } from "../../../components/admin-collection-state";
import { AdminPagination } from "../../../components/admin-pagination";
import { AdminStatusBadge } from "../../../components/admin-status-badge";
import { PlatformAdminShell } from "../../../components/platform-admin-shell";
import { type AdminCityLookupResponse } from "../../../lib/admin-lookups";
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
  const create = searchParam(params, "create");
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
  const createBusinessQuery = queryString({
    q,
    city,
    status,
    template,
    page: page > 1 ? page : undefined,
    create: "true",
  });
  const createBusinessReturnTo = `/admin/businesses?${createBusinessQuery}`;
  const canCreateBusiness = session.auth.activeAccess.permissions.includes("businesses.manage");
  const initialCityLookup = `/api/v2/platform-core/lookups/cities?ready=true&limit=20${
    city ? `&q=${encodeURIComponent(city)}` : ""
  }`;

  const [businesses, cities, templates] = await Promise.all([
    loadAdminResponse<PlatformBusinessesResponse>(
      `/api/v2/platform-core/businesses?${queryString(query)}`,
      session.token,
    ),
    loadAdminResponse<AdminCityLookupResponse>(initialCityLookup, session.token),
    loadAdminResponse<PlatformTemplatesResponse>("/api/v2/platform-core/templates", session.token),
  ]);
  const activeTemplates = templates.data?.items.filter((item) => item.active) ?? [];
  const readyCities = cities.data?.items ?? [];
  const defaultCity = readyCities.some((item) => item.slug === city) ? city : "";
  const setupResourcesFailed = cities.failed || templates.failed;

  return (
    <PlatformAdminShell
      breadcrumbs={[{ href: "/admin", label: "Dashboard" }, { label: "Attività" }]}
      currentPath="/admin/businesses"
      description="Cerca le attività del tuo ambito, apri la gestione del locale e controlla la visibilità pubblica."
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
      </section>

      <section className="admin-toolbar" aria-labelledby="business-filters-title">
        <div className="section-header">
          <p className="section-label">Ricerca e filtri</p>
          <h2 id="business-filters-title">Trova un'attività</h2>
        </div>
        <form className="admin-filter-form admin-filter-form-wide" method="get">
          <label className="field">
            <span>Nome, slug o gestore</span>
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
            <span>Tipo di attività</span>
            <select defaultValue={template} name="template">
              <option value="">Tutti i tipi</option>
              {templates.data?.items.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="admin-filter-actions">
            <button className="admin-button form-button" type="submit">
              Applica filtri
            </button>
            {q || city || status || template ? (
              <Link className="admin-button ghost-button" href="/admin/businesses">
                Azzera
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      {canCreateBusiness && setupResourcesFailed ? (
        <AdminCollectionError
          message="Non è stato possibile caricare città e tipi di attività necessari alla creazione."
          retryHref={returnTo}
        />
      ) : canCreateBusiness && readyCities.length && activeTemplates.length ? (
        <details className="admin-create-panel" open={create === "true"}>
          <summary>Nuova attività in una città pronta</summary>
          <BusinessCreateForm
            cities={readyCities}
            defaultCity={defaultCity}
            returnTo={createBusinessReturnTo}
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
            {!activeTemplates.length
              ? "Non ci sono tipi di attività attivi disponibili."
              : "Non ci sono città pubbliche con almeno una categoria attiva nel tuo ambito."}
          </p>
          <Link className="admin-button ghost-button" href="/admin/cities">
            Vai alle città
          </Link>
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
                    <th>Tipo di attività</th>
                    <th>Gestore</th>
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
                            href={`/${encodeURIComponent(business.city.slug)}/${encodeURIComponent(business.slug)}/admin`}
                          >
                            Continua configurazione
                          </Link>
                          {isBusinessPublic(business) ? (
                            <Link
                              className="table-link"
                              href={`/${encodeURIComponent(business.city.slug)}/${encodeURIComponent(business.slug)}`}
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
            text={
              canCreateBusiness
                ? "Modifica la ricerca oppure crea una nuova attività."
                : "Modifica la ricerca per trovare un'attività accessibile nel tuo ambito."
            }
          />
        )}
      </section>
    </PlatformAdminShell>
  );
}
