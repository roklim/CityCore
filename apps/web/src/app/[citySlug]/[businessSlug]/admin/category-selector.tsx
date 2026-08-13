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
  const [primaryId, setPrimaryId] = useState(
    () =>
      assignments.find((assignment) => assignment.active && assignment.primary)?.id ??
      assignments.find((assignment) => assignment.active)?.id ??
      "",
  );
  const returnTo = `/${encodeURIComponent(citySlug)}/${encodeURIComponent(businessSlug)}/admin/categories`;
  const hasValidSelection = selectedIds.size > 0 && selectedIds.has(primaryId);

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
          <div
            className={`business-check-option${category.parentId ? " business-category-child" : ""}`}
            key={category.id}
          >
            <input
              aria-label={`Assegna ${category.name}`}
              checked={selectedIds.has(category.id)}
              name="categoryIds"
              onChange={(event) => {
                const next = new Set(selectedIds);
                if (event.target.checked) {
                  next.add(category.id);
                  if (!primaryId) setPrimaryId(category.id);
                } else {
                  next.delete(category.id);
                  if (primaryId === category.id) setPrimaryId(next.values().next().value ?? "");
                }
                setSelectedIds(next);
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
            <label className="admin-check-field">
              <input
                checked={primaryId === category.id}
                disabled={!selectedIds.has(category.id)}
                name="primaryCategoryId"
                onChange={() => setPrimaryId(category.id)}
                type="radio"
                value={category.id}
              />
              Primaria
            </label>
          </div>
        ))}
      </div>
      {inactiveAssignments.length ? (
        <div className="admin-state-card admin-state-inline">
          <strong>Categorie non più attive</strong>
          <p>
            {inactiveAssignments.map((assignment) => assignment.name).join(", ")}. Non sono
            selezionabili e verranno rimosse al prossimo salvataggio.
          </p>
        </div>
      ) : null}
      {!selectedIds.size ? (
        <div className="admin-state-card admin-state-inline" role="alert">
          <strong>Seleziona almeno una categoria.</strong>
          <p>Senza una categoria attiva la scheda non può essere pubblicata.</p>
        </div>
      ) : !primaryId ? (
        <div className="admin-state-card admin-state-inline" role="alert">
          <strong>Scegli la categoria primaria.</strong>
          <p>La primaria rappresenta l’attività nei risultati della directory.</p>
        </div>
      ) : null}
      {hasValidSelection ? (
        <AdminSubmitButton pendingLabel="Salvataggio…">Salva categorie</AdminSubmitButton>
      ) : (
        <button className="admin-button form-button" disabled type="submit">
          Salva categorie
        </button>
      )}
    </form>
  );
}
