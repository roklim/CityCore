"use client";

import { useState } from "react";
import { AdminSubmitButton } from "../../../../components/admin-submit-button";
import type {
  PlatformBusinessCategoryAssignment,
  PlatformCityCategory,
} from "../../../../lib/platform-api";
import { updateBusinessCategoriesAction } from "./actions";

export function BusinessCategorySelector({
  citySlug,
  businessSlug,
  assignments,
  categories,
}: {
  citySlug: string;
  businessSlug: string;
  assignments: PlatformBusinessCategoryAssignment[];
  categories: PlatformCityCategory[];
}) {
  const activeCategories = categories.filter((category) => category.active);
  const inactiveAssignments = assignments.filter(
    (assignment) => !categories.find((category) => category.id === assignment.id)?.active,
  );
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(assignments.filter((assignment) => assignment.active).map((item) => item.id)),
  );
  const returnTo = `/${encodeURIComponent(citySlug)}/${encodeURIComponent(businessSlug)}/admin/categories`;

  return (
    <form action={updateBusinessCategoriesAction} className="business-management-form">
      <input name="citySlug" type="hidden" value={citySlug} />
      <input name="businessSlug" type="hidden" value={businessSlug} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <div className="business-selection-summary" role="status">
        <strong>{selectedIds.size}</strong>
        <span>{selectedIds.size === 1 ? "categoria selezionata" : "categorie selezionate"}</span>
      </div>
      <div className="business-category-grid">
        {activeCategories.map((category) => (
          <label
            className={`business-check-option${category.parentId ? " business-category-child" : ""}`}
            key={category.id}
          >
            <input
              checked={selectedIds.has(category.id)}
              name="categoryIds"
              onChange={(event) => {
                setSelectedIds((current) => {
                  const next = new Set(current);
                  if (event.target.checked) next.add(category.id);
                  else next.delete(category.id);
                  return next;
                });
              }}
              type="checkbox"
              value={category.id}
            />
            <span>
              <strong>{category.name}</strong>
              <small>
                {category.parentId ? "Sottocategoria" : "Categoria principale"}
                {category.description ? ` · ${category.description}` : ""}
              </small>
            </span>
          </label>
        ))}
      </div>
      {inactiveAssignments.length ? (
        <div className="admin-state-card">
          <strong>Categorie non più attive</strong>
          <p>
            {inactiveAssignments.map((assignment) => assignment.name).join(", ")}. Non sono
            selezionabili e verranno rimosse al prossimo salvataggio.
          </p>
        </div>
      ) : null}
      <AdminSubmitButton pendingLabel="Salvataggio…">Salva categorie</AdminSubmitButton>
    </form>
  );
}
