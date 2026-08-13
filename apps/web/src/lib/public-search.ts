import type { PublicBusinessCategory } from "./platform-api";

export type SearchableBusiness = {
  name: string;
  summary: string;
  categoryLabel: string;
  area: string;
  categories?: readonly PublicBusinessCategory[];
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

/** Real city assignments take precedence; the template is used only when none exist. */
export function getPublicBusinessCategories(business: CategorizedPublicBusiness) {
  if (business.categories?.length) {
    return business.categories.map((category) => ({
      id: category.slug,
      label: category.name,
    }));
  }

  const fallbackLabel = getPublicBusinessCategoryLabel(business.category);
  return business.category && fallbackLabel
    ? [{ id: business.category, label: fallbackLabel }]
    : [];
}

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("it-IT")
    .trim()
    .replace(/\s+/g, " ");
}

export type CitySearchResolution =
  | { status: "empty" }
  | { status: "match"; slug: string }
  | { status: "ambiguous" }
  | { status: "unavailable" };

export function resolveCitySearch(
  query: string,
  cities: readonly { slug: string; name: string }[],
): CitySearchResolution {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return { status: "empty" };

  const exactMatches = cities.filter(
    (city) =>
      normalizeSearchText(city.name) === normalizedQuery ||
      normalizeSearchText(city.slug) === normalizedQuery,
  );

  if (exactMatches.length === 1) {
    const slug = exactMatches[0]?.slug;
    return slug ? { status: "match", slug } : { status: "unavailable" };
  }
  if (exactMatches.length > 1) return { status: "ambiguous" };

  const partialMatches = cities.filter(
    (city) =>
      normalizeSearchText(city.name).includes(normalizedQuery) ||
      normalizeSearchText(city.slug).includes(normalizedQuery),
  );

  if (partialMatches.length === 1) {
    const slug = partialMatches[0]?.slug;
    return slug ? { status: "match", slug } : { status: "unavailable" };
  }
  if (partialMatches.length > 1) return { status: "ambiguous" };

  return { status: "unavailable" };
}

export function findMatchingCitySlug(
  query: string,
  cities: readonly { slug: string; name: string }[],
) {
  const resolution = resolveCitySearch(query, cities);
  return resolution.status === "match" ? resolution.slug : null;
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
      ...(business.categories?.map((category) => category.name) ?? []),
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
    for (const category of getPublicBusinessCategories(business)) {
      groups.set(category.id, [...(groups.get(category.id) ?? []), business]);
    }
  }

  return [...groups.entries()]
    .map(([id, items]) => ({
      id,
      label:
        getPublicBusinessCategories(items[0]).find((category) => category.id === id)?.label ?? id,
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

export function groupPublicBusinessesForDisplay<TBusiness extends CategorizedPublicBusiness>(
  businesses: readonly TBusiness[],
  sectionId: string,
): PublicBusinessSection<TBusiness>[] {
  if (sectionId !== "all") {
    const category = businesses
      .flatMap((business) => getPublicBusinessCategories(business))
      .find((candidate) => candidate.id === sectionId);
    return category && businesses.length
      ? [{ id: category.id, label: category.label, businesses: [...businesses] }]
      : [];
  }

  const groups = new Map<string, PublicBusinessSection<TBusiness>>();
  for (const business of businesses) {
    const category = getPublicBusinessCategories(business)[0];
    if (!category) continue;
    const group = groups.get(category.id);
    if (group) group.businesses.push(business);
    else groups.set(category.id, { ...category, businesses: [business] });
  }
  return [...groups.values()].sort((left, right) => left.label.localeCompare(right.label, "it"));
}

export function filterPublicBusinessesBySection<TBusiness extends CategorizedPublicBusiness>(
  businesses: readonly TBusiness[],
  query: string,
  sectionId: string,
) {
  const searchedBusinesses = filterPublicBusinesses(businesses, query);

  if (sectionId === "all") return searchedBusinesses;

  return searchedBusinesses.filter((business) =>
    getPublicBusinessCategories(business).some((category) => category.id === sectionId),
  );
}
