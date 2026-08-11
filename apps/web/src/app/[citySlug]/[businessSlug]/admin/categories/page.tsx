import {
  AdminCollectionError,
  AdminEmptyState,
} from "../../../../../components/admin-collection-state";
import {
  businessAdminApiPath,
  getBusinessAdminContext,
  loadBusinessAdminResponse,
} from "../../../../../lib/business-admin-server";
import { businessAdminSectionPath } from "../../../../../lib/business-admin-navigation";
import type { PlatformBusinessCategoriesResponse } from "../../../../../lib/platform-api";
import { BusinessCategorySelector } from "../category-selector";

export const metadata = { title: "Categorie attività" };

export default async function BusinessCategoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ citySlug: string; businessSlug: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { citySlug, businessSlug } = await params;
  const feedback = await searchParams;
  const { session } = await getBusinessAdminContext(citySlug, businessSlug);
  const path = businessAdminSectionPath(citySlug, businessSlug, "categories");
  const categories = await loadBusinessAdminResponse<PlatformBusinessCategoriesResponse>(
    `${businessAdminApiPath(citySlug, businessSlug)}/categories`,
    session.token,
  );
  const canManage = session.auth.activeAccess.permissions.includes("businesses.manage");

  return (
    <>
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
      <section className="data-card" aria-labelledby="categories-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Classificazione</p>
            <h2 id="categories-title">Categorie disponibili</h2>
          </div>
          {categories.data ? (
            <span className="admin-result-count">{categories.data.items.length} assegnate</span>
          ) : null}
        </div>
        {categories.failed ? (
          <AdminCollectionError
            message="Non è stato possibile caricare le categorie."
            retryHref={path}
          />
        ) : !categories.data.availableCategories.length ? (
          <AdminEmptyState
            title="Nessuna categoria disponibile."
            text="Un amministratore della città deve prima configurare categorie attive."
          />
        ) : canManage ? (
          <BusinessCategorySelector
            assignments={categories.data.items}
            businessSlug={businessSlug}
            categories={categories.data.availableCategories}
            citySlug={citySlug}
          />
        ) : (
          <div className="business-category-grid">
            {categories.data.items.length ? (
              categories.data.items.map((category) => (
                <article className="business-check-option" key={category.id}>
                  <span>
                    <strong>{category.name}</strong>
                    <small>{category.parentId ? "Sottocategoria" : "Categoria principale"}</small>
                  </span>
                </article>
              ))
            ) : (
              <AdminEmptyState title="Nessuna categoria assegnata." />
            )}
            <p className="muted-copy">
              Il tuo ruolo può consultare le categorie ma non modificarle.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
