import Link from "next/link";
import {
  AdminCollectionError,
  AdminEmptyState,
} from "../../../../../components/admin-collection-state";
import { AdminStatusBadge } from "../../../../../components/admin-status-badge";
import { AdminSubmitButton } from "../../../../../components/admin-submit-button";
import { PlatformAdminShell } from "../../../../../components/platform-admin-shell";
import { loadAdminResponse, requirePlatformAdminSession } from "../../../../../lib/admin-server";
import type {
  PlatformCitiesResponse,
  PlatformCityCategoriesResponse,
} from "../../../../../lib/platform-api";
import {
  createCityCategoryAction,
  deleteCityCategoryAction,
  updateCityAction,
  updateCityCategoryAction,
} from "../../../platform-actions";

export const metadata = { title: "Categorie città" };

type CityCategoriesPageProps = {
  params: Promise<{ citySlug: string }>;
  searchParams: Promise<{ notice?: string; error?: string; create?: string }>;
};

export default async function CityCategoriesPage({
  params,
  searchParams,
}: CityCategoriesPageProps) {
  const { citySlug } = await params;
  const feedback = await searchParams;
  const session = await requirePlatformAdminSession();
  const encodedCitySlug = encodeURIComponent(citySlug);
  const path = `/admin/cities/${encodedCitySlug}/categories`;
  const [cities, categories] = await Promise.all([
    loadAdminResponse<PlatformCitiesResponse>(
      `/api/v2/platform-core/cities?q=${encodedCitySlug}&page=1&limit=50`,
      session.token,
    ),
    loadAdminResponse<PlatformCityCategoriesResponse>(
      `/api/v2/platform-core/cities/${encodedCitySlug}/categories`,
      session.token,
    ),
  ]);
  const city = cities.data?.items.find((item) => item.slug === citySlug) ?? null;
  const items = categories.data?.items ?? [];
  const rootCategories = items.filter((item) => item.parentId === null);
  const activeCategoryCount = items.filter((item) => item.active).length;
  const cityIsPublic = Boolean(city?.active && city.status === "active");
  const canManage = session.auth.activeAccess.permissions.includes("cities.manage");
  const showCategoryForm = feedback.create === "true" || !activeCategoryCount;

  return (
    <PlatformAdminShell
      breadcrumbs={[
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/cities", label: "Città" },
        {
          href: `/admin/cities?q=${encodedCitySlug}`,
          label: city?.name ?? citySlug,
        },
        { label: "Categorie" },
      ]}
      currentPath="/admin/cities"
      description="Attiva la città e prepara le categorie che potranno essere assegnate alle attività."
      session={session}
      title={city ? `Configura ${city.name}` : "Configura città"}
    >
      {feedback.notice ? (
        <p className="surface-success" role="status">
          {feedback.notice}
        </p>
      ) : null}
      {feedback.error ? (
        <p className="surface-error" role="alert">
          {feedback.error}
        </p>
      ) : null}

      {cities.failed || categories.failed ? (
        <AdminCollectionError
          message="Non è stato possibile caricare la configurazione della città."
          retryHref={path}
        />
      ) : !city ? (
        <section className="admin-state-card is-error" aria-labelledby="missing-city-title">
          <div>
            <p className="section-label">Città non disponibile</p>
            <h2 id="missing-city-title">Non puoi configurare questa città</h2>
          </div>
          <p>Torna all&apos;elenco e scegli una città accessibile nel tuo ambito.</p>
          <div className="admin-filter-actions">
            <Link className="admin-button ghost-button" href="/admin/cities">
              Torna alle città
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="admin-setup-flow" aria-labelledby="city-setup-title">
            <div className="section-header">
              <p className="section-label">Percorso guidato</p>
              <h2 id="city-setup-title">Prepara la città per le attività</h2>
            </div>
            <div className="admin-setup-steps">
              <article className={cityIsPublic ? "is-complete" : "is-current"}>
                <span>1</span>
                <div>
                  <strong>Attiva la città</strong>
                  <p>
                    {cityIsPublic
                      ? "La città è visibile nella directory pubblica."
                      : "Imposta la città come abilitata e attiva per renderla pubblica."}
                  </p>
                  {!cityIsPublic && canManage ? (
                    <form action={updateCityAction}>
                      <input name="returnTo" type="hidden" value={path} />
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
                </div>
              </article>
              <article className={activeCategoryCount ? "is-complete" : "is-current"}>
                <span>2</span>
                <div>
                  <strong>Crea le categorie</strong>
                  <p>
                    {activeCategoryCount
                      ? `${activeCategoryCount} categorie attive disponibili.`
                      : "Crea almeno una categoria attiva, per esempio Ristoranti o Negozi."}
                  </p>
                  {canManage ? (
                    <Link href={`${path}?create=true#new-category`}>Aggiungi categoria ↓</Link>
                  ) : null}
                </div>
              </article>
              <article
                className={cityIsPublic && activeCategoryCount ? "is-current" : "is-disabled"}
              >
                <span>3</span>
                <div>
                  <strong>Crea un'attività</strong>
                  <p>Inserisci il locale in bozza e completa la checklist di pubblicazione.</p>
                  {cityIsPublic && activeCategoryCount ? (
                    <Link href={`/admin/businesses?city=${encodedCitySlug}`}>
                      Vai alle attività →
                    </Link>
                  ) : (
                    <small>Completa prima i passaggi precedenti.</small>
                  )}
                </div>
              </article>
            </div>
          </section>

          {canManage ? (
            <details className="admin-create-panel" id="new-category" open={showCategoryForm}>
              <summary>Nuova categoria</summary>
              <form action={createCityCategoryAction} className="admin-edit-form">
                <input name="returnTo" type="hidden" value={`${path}?create=true`} />
                <input name="citySlug" type="hidden" value={city.slug} />
                <label className="field">
                  <span>Nome categoria</span>
                  <input
                    name="name"
                    minLength={2}
                    maxLength={160}
                    placeholder="Es. Ristoranti"
                    required
                  />
                </label>
                <label className="field">
                  <span>Slug (facoltativo)</span>
                  <input name="slug" maxLength={160} placeholder="Generato automaticamente" />
                </label>
                <label className="field admin-field-wide">
                  <span>Descrizione (facoltativa)</span>
                  <textarea
                    name="description"
                    maxLength={2000}
                    placeholder="Spiega in modo sintetico quali attività appartengono alla categoria."
                    rows={3}
                  />
                </label>
                <label className="field">
                  <span>Categoria principale</span>
                  <select defaultValue="" name="parentId">
                    <option value="">Nessuna: crea una categoria principale</option>
                    {rootCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Ordine</span>
                  <input defaultValue="0" min="0" max="10000" name="sortOrder" type="number" />
                </label>
                <label className="admin-check-field">
                  <input defaultChecked name="active" type="checkbox" /> Subito disponibile per le
                  attività
                </label>
                <p className="admin-form-note">
                  Usa una categoria principale per raggruppare; scegli un genitore soltanto per una
                  sottocategoria. Lo slug può essere lasciato vuoto.
                </p>
                <AdminSubmitButton pendingLabel="Creazione…">Crea categoria</AdminSubmitButton>
              </form>
            </details>
          ) : null}

          <section className="data-card" aria-labelledby="category-list-title">
            <div className="card-heading">
              <div>
                <p className="section-label">Classificazione cittadina</p>
                <h2 id="category-list-title">Categorie di {city.name}</h2>
              </div>
              <span className="admin-result-count">
                {items.length} totali · {activeCategoryCount} attive
              </span>
            </div>
            {items.length ? (
              <div
                className="table-wrap"
                role="region"
                aria-label="Categorie della città"
                tabIndex={0}
              >
                <table className="data-table admin-wide-table">
                  <caption className="visually-hidden">
                    Categorie configurate per {city.name}
                  </caption>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Livello</th>
                      <th>Stato</th>
                      <th>Ordine</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((category) => {
                      const parent = category.parentId
                        ? items.find((item) => item.id === category.parentId)
                        : null;
                      const hasChildren = items.some((item) => item.parentId === category.id);
                      return (
                        <tr key={category.id}>
                          <td>
                            <strong>{category.name}</strong>
                            <span>{category.slug}</span>
                          </td>
                          <td>{parent ? `Sotto ${parent.name}` : "Principale"}</td>
                          <td>
                            <AdminStatusBadge status={category.active ? "active" : "disabled"} />
                          </td>
                          <td>{category.sortOrder}</td>
                          <td>
                            {canManage ? (
                              <div className="table-actions">
                                <details className="admin-inline-details">
                                  <summary>Modifica</summary>
                                  <form
                                    action={updateCityCategoryAction}
                                    className="admin-edit-form is-compact"
                                  >
                                    <input name="returnTo" type="hidden" value={path} />
                                    <input name="citySlug" type="hidden" value={city.slug} />
                                    <input name="categoryId" type="hidden" value={category.id} />
                                    <label className="field">
                                      <span>Nome</span>
                                      <input
                                        defaultValue={category.name}
                                        maxLength={160}
                                        name="name"
                                        required
                                      />
                                    </label>
                                    <label className="field">
                                      <span>Slug</span>
                                      <input
                                        defaultValue={category.slug}
                                        maxLength={160}
                                        name="slug"
                                        required
                                      />
                                    </label>
                                    <label className="field admin-field-wide">
                                      <span>Descrizione</span>
                                      <textarea
                                        defaultValue={category.description ?? ""}
                                        maxLength={2000}
                                        name="description"
                                        rows={3}
                                      />
                                    </label>
                                    {hasChildren ? (
                                      <>
                                        <input name="parentId" type="hidden" value="" />
                                        <p className="admin-form-note">
                                          Questa categoria contiene sottocategorie e resta di primo
                                          livello.
                                        </p>
                                      </>
                                    ) : (
                                      <label className="field">
                                        <span>Categoria principale</span>
                                        <select
                                          defaultValue={category.parentId ?? ""}
                                          name="parentId"
                                        >
                                          <option value="">Nessuna</option>
                                          {rootCategories
                                            .filter((item) => item.id !== category.id)
                                            .map((item) => (
                                              <option key={item.id} value={item.id}>
                                                {item.name}
                                              </option>
                                            ))}
                                        </select>
                                      </label>
                                    )}
                                    <label className="field">
                                      <span>Ordine</span>
                                      <input
                                        defaultValue={category.sortOrder}
                                        min="0"
                                        max="10000"
                                        name="sortOrder"
                                        type="number"
                                      />
                                    </label>
                                    <label className="admin-check-field">
                                      <input
                                        defaultChecked={category.active}
                                        name="active"
                                        type="checkbox"
                                      />{" "}
                                      Disponibile per le attività
                                    </label>
                                    <AdminSubmitButton pendingLabel="Salvataggio…">
                                      Salva categoria
                                    </AdminSubmitButton>
                                  </form>
                                </details>
                                {!hasChildren ? (
                                  <details className="admin-inline-details admin-danger-details">
                                    <summary>Elimina</summary>
                                    <p>
                                      Se la categoria è già assegnata, CityCore ne impedirà
                                      l'eliminazione: in quel caso disattivala.
                                    </p>
                                    <form action={deleteCityCategoryAction}>
                                      <input name="returnTo" type="hidden" value={path} />
                                      <input name="citySlug" type="hidden" value={city.slug} />
                                      <input name="categoryId" type="hidden" value={category.id} />
                                      <AdminSubmitButton
                                        className="admin-button ghost-button danger-button"
                                        pendingLabel="Eliminazione…"
                                      >
                                        Elimina definitivamente
                                      </AdminSubmitButton>
                                    </form>
                                  </details>
                                ) : null}
                              </div>
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
            ) : (
              <AdminEmptyState
                title="Nessuna categoria configurata."
                text={
                  canManage
                    ? "Crea la prima categoria attiva per poter completare e pubblicare le attività della città."
                    : "Non ci sono ancora categorie da consultare per questa città."
                }
              />
            )}
          </section>
        </>
      )}
    </PlatformAdminShell>
  );
}
