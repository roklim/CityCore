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
  type PlatformCitiesResponse,
  type PlatformCityRegistryResponse,
} from "../../../lib/platform-api";
import {
  activateRegistryCityAction,
  createCityAction,
  updateCityAction,
} from "../platform-actions";

export const metadata = { title: "Gestione città" };

type CitiesPageProps = { searchParams: Promise<AdminSearchParams> };

export default async function AdminCitiesPage({ searchParams }: CitiesPageProps) {
  const params = await searchParams;
  const session = await requirePlatformAdminSession();
  const q = searchParam(params, "q");
  const status = searchParam(params, "status");
  const active = searchParam(params, "active");
  const page = positivePage(searchParam(params, "page"));
  const registryQ = searchParam(params, "registryQ");
  const linked = searchParam(params, "linked");
  const registryPage = positivePage(searchParam(params, "registryPage"));
  const create = searchParam(params, "create");
  const notice = searchParam(params, "notice");
  const error = searchParam(params, "error");
  const filters = { q, status, active, page, limit: 20 };
  const registryFilters = { q: registryQ, linked, page: registryPage, limit: 15 };
  const currentQuery = queryString({
    q,
    status,
    active,
    page: page > 1 ? page : undefined,
    registryQ,
    linked,
    registryPage: registryPage > 1 ? registryPage : undefined,
  });
  const returnTo = currentQuery ? `/admin/cities?${currentQuery}` : "/admin/cities";
  const createCityQuery = queryString({
    q,
    status,
    active,
    page: page > 1 ? page : undefined,
    registryQ,
    linked,
    registryPage: registryPage > 1 ? registryPage : undefined,
    create: "true",
  });
  const createCityReturnTo = `/admin/cities?${createCityQuery}`;
  const registryStateQuery = queryString({
    registryQ,
    linked,
    registryPage: registryPage > 1 ? registryPage : undefined,
  });
  const clearCitiesHref = registryStateQuery
    ? `/admin/cities?${registryStateQuery}`
    : "/admin/cities";
  const cityStateQuery = queryString({ q, status, active, page: page > 1 ? page : undefined });
  const clearRegistryHref = cityStateQuery ? `/admin/cities?${cityStateQuery}` : "/admin/cities";
  const isPlatformScope = session.auth.activeAccess.scopeType === "platform";
  const canCreateCity =
    session.auth.activeAccess.permissions.includes("platform.manage") && isPlatformScope;
  const canManageCities = session.auth.activeAccess.permissions.includes("cities.manage");

  const [cities, registry] = await Promise.all([
    loadAdminResponse<PlatformCitiesResponse>(
      `/api/v2/platform-core/cities?${queryString(filters)}`,
      session.token,
    ),
    isPlatformScope
      ? loadAdminResponse<PlatformCityRegistryResponse>(
          `/api/v2/platform-core/city-registry?${queryString(registryFilters)}`,
          session.token,
        )
      : Promise.resolve(null),
  ]);

  return (
    <PlatformAdminShell
      breadcrumbs={[{ href: "/admin", label: "Dashboard" }, { label: "Città" }]}
      currentPath="/admin/cities"
      description="Aggiungi una città, rendila attiva e configura le categorie prima di creare le attività."
      session={session}
      title="Città"
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

      <section className="admin-state-card" aria-labelledby="city-flow-title">
        <div>
          <p className="section-label">Da dove iniziare</p>
          <h2 id="city-flow-title">Città → categorie → attività</h2>
        </div>
        <p>
          Una città diventa pubblica quando è abilitata e ha stato Attivo. Aggiungi poi almeno una
          categoria attiva: CityCore ti guiderà alla creazione della prima attività.
        </p>
      </section>

      <section className="admin-toolbar" aria-labelledby="cities-filters-title">
        <div className="section-header">
          <p className="section-label">Ricerca e filtri</p>
          <h2 id="cities-filters-title">Trova una città</h2>
        </div>
        <form className="admin-filter-form" method="get">
          {registryQ ? <input name="registryQ" type="hidden" value={registryQ} /> : null}
          {linked ? <input name="linked" type="hidden" value={linked} /> : null}
          {registryPage > 1 ? (
            <input name="registryPage" type="hidden" value={registryPage} />
          ) : null}
          <label className="field">
            <span>Nome, slug, provincia o regione</span>
            <input defaultValue={q} name="q" placeholder="Es. Cagli" type="search" />
          </label>
          <label className="field">
            <span>Stato</span>
            <select defaultValue={status} name="status">
              <option value="">Tutti gli stati</option>
              <option value="active">Attivo</option>
              <option value="coming_soon">In preparazione</option>
              <option value="disabled">Disabilitato</option>
            </select>
          </label>
          <label className="field">
            <span>Visibilità</span>
            <select defaultValue={active} name="active">
              <option value="">Tutte</option>
              <option value="true">Abilitate</option>
              <option value="false">Non abilitate</option>
            </select>
          </label>
          <div className="admin-filter-actions">
            <button className="admin-button form-button" type="submit">
              Applica filtri
            </button>
            {q || status || active ? (
              <Link className="admin-button ghost-button" href={clearCitiesHref}>
                Azzera filtri città
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      {canCreateCity ? (
        <details className="admin-create-panel" open={create === "true"}>
          <summary>Nuova città</summary>
          <form action={createCityAction} className="admin-edit-form">
            <input name="returnTo" type="hidden" value={createCityReturnTo} />
            <label className="field">
              <span>Nome</span>
              <input name="name" required minLength={2} />
            </label>
            <label className="field">
              <span>Slug (facoltativo)</span>
              <input name="slug" />
            </label>
            <label className="field">
              <span>Provincia</span>
              <input name="province" />
            </label>
            <label className="field">
              <span>Regione</span>
              <input name="region" />
            </label>
            <label className="field">
              <span>Stato</span>
              <select defaultValue="coming_soon" name="status">
                <option value="coming_soon">In preparazione</option>
                <option value="active">Attivo</option>
                <option value="disabled">Disabilitato</option>
              </select>
            </label>
            <label className="admin-check-field">
              <input defaultChecked name="active" type="checkbox" /> Città abilitata
            </label>
            <AdminSubmitButton pendingLabel="Creazione…">Crea città</AdminSubmitButton>
          </form>
        </details>
      ) : null}

      <section className="data-card" aria-labelledby="cities-table-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Gestione città</p>
            <h2 id="cities-table-title">Città configurate</h2>
          </div>
          {cities.data ? (
            <span className="admin-result-count">{cities.data.total} risultati</span>
          ) : null}
        </div>
        {cities.failed ? (
          <AdminCollectionError
            message="Non è stato possibile caricare le città."
            retryHref={returnTo}
          />
        ) : cities.data.items.length ? (
          <>
            <div className="table-wrap" role="region" aria-label="Città disponibili" tabIndex={0}>
              <table className="data-table admin-wide-table">
                <caption className="visually-hidden">Città disponibili nel tuo ambito</caption>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Provincia</th>
                    <th>Regione</th>
                    <th>Stato</th>
                    <th>Categorie</th>
                    <th>Attività</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {cities.data.items.map((city) => (
                    <tr key={city.id}>
                      <td>
                        <strong>{city.name}</strong>
                        <span>{city.slug}</span>
                      </td>
                      <td>{city.province ?? "—"}</td>
                      <td>{city.region ?? "—"}</td>
                      <td>
                        <AdminStatusBadge status={city.active ? city.status : "disabled"} />
                      </td>
                      <td>{city.activeCategoryCount} attive</td>
                      <td>{city.businessCount}</td>
                      <td>
                        <div className="table-actions">
                          <Link
                            className="table-link"
                            href={`/admin/cities/${encodeURIComponent(city.slug)}/categories`}
                          >
                            Configura categorie
                          </Link>
                          <Link
                            className="table-link"
                            href={`/admin/businesses?city=${encodeURIComponent(city.slug)}`}
                          >
                            Vedi attività
                          </Link>
                          {city.active && city.status === "active" ? (
                            <Link className="table-link" href={`/${encodeURIComponent(city.slug)}`}>
                              Pagina pubblica
                            </Link>
                          ) : (
                            <span className="admin-muted-label">Non pubblica</span>
                          )}
                          {canManageCities && (!city.active || city.status !== "active") ? (
                            <form action={updateCityAction}>
                              <input name="returnTo" type="hidden" value={returnTo} />
                              <input name="citySlug" type="hidden" value={city.slug} />
                              <input name="name" type="hidden" value={city.name} />
                              <input name="slug" type="hidden" value={city.slug} />
                              <input name="province" type="hidden" value={city.province ?? ""} />
                              <input name="region" type="hidden" value={city.region ?? ""} />
                              <input name="status" type="hidden" value="active" />
                              <input name="active" type="hidden" value="on" />
                              <AdminSubmitButton
                                className="table-action-button"
                                pendingLabel="Attivazione…"
                              >
                                Attiva città
                              </AdminSubmitButton>
                            </form>
                          ) : null}
                          {canManageCities ? (
                            <details className="admin-inline-details">
                              <summary>Modifica città</summary>
                              <form
                                action={updateCityAction}
                                className="admin-edit-form is-compact"
                              >
                                <input name="returnTo" type="hidden" value={returnTo} />
                                <input name="citySlug" type="hidden" value={city.slug} />
                                <label className="field">
                                  <span>Nome</span>
                                  <input defaultValue={city.name} name="name" required />
                                </label>
                                <label className="field">
                                  <span>Slug</span>
                                  <input defaultValue={city.slug} name="slug" required />
                                </label>
                                <label className="field">
                                  <span>Provincia</span>
                                  <input defaultValue={city.province ?? ""} name="province" />
                                </label>
                                <label className="field">
                                  <span>Regione</span>
                                  <input defaultValue={city.region ?? ""} name="region" />
                                </label>
                                <label className="field">
                                  <span>Stato</span>
                                  <select defaultValue={city.status} name="status">
                                    <option value="active">Attivo</option>
                                    <option value="coming_soon">In preparazione</option>
                                    <option value="disabled">Disabilitato</option>
                                  </select>
                                </label>
                                <label className="admin-check-field">
                                  <input
                                    defaultChecked={city.active}
                                    name="active"
                                    type="checkbox"
                                  />{" "}
                                  Abilitata
                                </label>
                                <AdminSubmitButton pendingLabel="Salvataggio…">
                                  Salva città
                                </AdminSubmitButton>
                              </form>
                            </details>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              pathname="/admin/cities"
              page={cities.data.page}
              total={cities.data.total}
              totalPages={cities.data.totalPages}
              query={{ q, status, active, registryQ, linked, registryPage }}
            />
          </>
        ) : (
          <AdminEmptyState
            title="Non ci sono città corrispondenti ai filtri."
            text={
              canCreateCity
                ? "Modifica la ricerca oppure crea una nuova città."
                : "Modifica la ricerca per trovare una città accessibile nel tuo ambito."
            }
          />
        )}
      </section>

      {isPlatformScope && registry ? (
        <section className="data-card" aria-labelledby="registry-title">
          <div className="card-heading">
            <div>
              <p className="section-label">Registro territoriale</p>
              <h2 id="registry-title">Comuni da aggiungere</h2>
            </div>
            {registry.data ? (
              <span className="admin-result-count">{registry.data.total} comuni</span>
            ) : null}
          </div>
          <form className="admin-filter-form is-compact" method="get">
            {q ? <input name="q" type="hidden" value={q} /> : null}
            {status ? <input name="status" type="hidden" value={status} /> : null}
            {active ? <input name="active" type="hidden" value={active} /> : null}
            {page > 1 ? <input name="page" type="hidden" value={page} /> : null}
            <label className="field">
              <span>Comune</span>
              <input
                defaultValue={registryQ}
                name="registryQ"
                placeholder="Cerca nel registry"
                type="search"
              />
            </label>
            <label className="field">
              <span>Attivazione</span>
              <select defaultValue={linked} name="linked">
                <option value="">Tutti</option>
                <option value="true">Già attivati</option>
                <option value="false">Da attivare</option>
              </select>
            </label>
            <div className="admin-filter-actions">
              <button className="admin-button ghost-button" type="submit">
                Filtra comuni
              </button>
              {registryQ || linked ? (
                <Link className="admin-button ghost-button" href={clearRegistryHref}>
                  Azzera filtri comuni
                </Link>
              ) : null}
            </div>
          </form>
          {registry.failed ? (
            <AdminCollectionError
              message="Non è stato possibile caricare il registro città."
              retryHref={returnTo}
            />
          ) : registry.data.items.length ? (
            <>
              <div
                className="table-wrap"
                role="region"
                aria-label="Comuni disponibili"
                tabIndex={0}
              >
                <table className="data-table">
                  <caption className="visually-hidden">Comuni del registro territoriale</caption>
                  <thead>
                    <tr>
                      <th>Comune</th>
                      <th>Provincia</th>
                      <th>Regione</th>
                      <th>Stato</th>
                      <th>Già attivato?</th>
                      <th>Azione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registry.data.items.map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          <strong>{entry.name}</strong>
                          <span>{entry.slug}</span>
                        </td>
                        <td>{entry.provinceName ?? entry.provinceCode ?? "—"}</td>
                        <td>{entry.regionName ?? entry.regionCode ?? "—"}</td>
                        <td>
                          <AdminStatusBadge
                            status={entry.activeMunicipality ? "active" : "disabled"}
                          />
                        </td>
                        <td>{entry.linkedCity ? "Sì" : "No"}</td>
                        <td>
                          {entry.linkedCity ? (
                            <Link
                              className="table-link"
                              href={`/admin/cities?q=${encodeURIComponent(entry.linkedCity.slug)}`}
                            >
                              Gestisci città
                            </Link>
                          ) : (
                            <form action={activateRegistryCityAction}>
                              <input name="returnTo" type="hidden" value={returnTo} />
                              <input name="registryId" type="hidden" value={entry.id} />
                              <input name="name" type="hidden" value={entry.name} />
                              <input name="slug" type="hidden" value={entry.slug} />
                              <input
                                name="province"
                                type="hidden"
                                value={entry.provinceCode ?? ""}
                              />
                              <input name="region" type="hidden" value={entry.regionName ?? ""} />
                              <AdminSubmitButton
                                className="table-action-button"
                                pendingLabel="Aggiunta…"
                              >
                                Aggiungi e configura
                              </AdminSubmitButton>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AdminPagination
                pathname="/admin/cities"
                page={registry.data.page}
                pageParam="registryPage"
                total={registry.data.total}
                totalPages={registry.data.totalPages}
                query={{ q, status, active, page, registryQ, linked }}
              />
            </>
          ) : (
            <AdminEmptyState title="Nessun comune corrisponde ai filtri." />
          )}
        </section>
      ) : null}
    </PlatformAdminShell>
  );
}
