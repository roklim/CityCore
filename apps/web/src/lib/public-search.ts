export type SearchableBusiness = {
  name: string;
  summary: string;
  categoryLabel: string;
  area: string;
  searchTerms?: readonly string[];
};

export type CategorizedPublicBusiness = SearchableBusiness & {
  category: string | null;
  categoryLabel: string;
};

export type PublicBusinessSection<TBusiness> = {
  id: string;
  label: string;
  businesses: TBusiness[];
};

const categoryLabels: Record<string, string> = {
  commerce: "Attività locali",
  service: "Servizi",
  hospitality: "Ospitalità",
  editorial: "Eventi e annunci",
  custom: "Altre attività",
};

const categoryOrder = ["commerce", "service", "hospitality", "editorial", "custom"];

export function getPublicBusinessCategoryLabel(category: string | null) {
  if (!category) return null;
  return categoryLabels[category] ?? null;
}

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("it-IT")
    .trim()
    .replace(/\s+/g, " ");
}

export function findMatchingCitySlug(
  query: string,
  cities: readonly { slug: string; name: string }[],
) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return null;

  const exact = cities.find(
    (city) =>
      normalizeSearchText(city.name) === normalizedQuery ||
      normalizeSearchText(city.slug) === normalizedQuery,
  );

  if (exact) return exact.slug;

  return (
    cities.find(
      (city) =>
        normalizeSearchText(city.name).includes(normalizedQuery) ||
        normalizeSearchText(city.slug).includes(normalizedQuery),
    )?.slug ?? null
  );
}

export function filterPublicBusinesses<TBusiness extends SearchableBusiness>(
  businesses: readonly TBusiness[],
  query: string,
) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return [...businesses];

  return businesses.filter((business) => {
    const values = [
      business.name,
      business.summary,
      business.categoryLabel,
      business.area,
      ...(business.searchTerms ?? []),
    ];

    return values.some((value) => normalizeSearchText(value).includes(normalizedQuery));
  });
}

export function groupPublicBusinessesByCategory<TBusiness extends CategorizedPublicBusiness>(
  businesses: readonly TBusiness[],
): PublicBusinessSection<TBusiness>[] {
  const groups = new Map<string, TBusiness[]>();

  for (const business of businesses) {
    const category = business.category;
    const label = getPublicBusinessCategoryLabel(category);

    if (!category || !label) continue;

    groups.set(category, [...(groups.get(category) ?? []), business]);
  }

  return [...groups.entries()]
    .map(([id, items]) => ({
      id,
      label: getPublicBusinessCategoryLabel(id) ?? id,
      businesses: items,
    }))
    .sort((left, right) => {
      const leftIndex = categoryOrder.indexOf(left.id);
      const rightIndex = categoryOrder.indexOf(right.id);
      const normalizedLeftIndex = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const normalizedRightIndex = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

      return (
        normalizedLeftIndex - normalizedRightIndex || left.label.localeCompare(right.label, "it")
      );
    });
}

export function filterPublicBusinessesBySection<TBusiness extends CategorizedPublicBusiness>(
  businesses: readonly TBusiness[],
  query: string,
  sectionId: string,
) {
  const searchedBusinesses = filterPublicBusinesses(businesses, query);

  if (sectionId === "all") return searchedBusinesses;

  return searchedBusinesses.filter((business) => business.category === sectionId);
}

export function getGeolocationFallbackMessage(reason: "unsupported" | "denied" | "unmapped") {
  switch (reason) {
    case "unsupported":
      return "La posizione non è disponibile su questo dispositivo. Scegli una città attiva.";
    case "denied":
      return "Non possiamo leggere la tua posizione. Scegli una città attiva.";
    case "unmapped":
      return "La posizione è disponibile, ma non possiamo associarla a una città pubblica. Scegli una città attiva.";
  }
}
