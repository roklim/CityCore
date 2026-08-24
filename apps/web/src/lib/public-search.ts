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

export type PublicBusinessSearchIndex<TBusiness extends CategorizedPublicBusiness> = {
  businesses: readonly TBusiness[];
  normalizedValues: readonly (readonly string[])[];
  trigramPostings: ReadonlyMap<string, readonly number[]>;
  categoryPostings: ReadonlyMap<string, readonly number[]>;
  stats: {
    itemCount: number;
    normalizedFieldCount: number;
    trigramCount: number;
    postingCount: number;
  };
};

const categoryLabels: Record<string, string> = {
  commerce: "Attività locali",
  service: "Servizi",
  hospitality: "Ospitalità",
  editorial: "Eventi e annunci",
  custom: "Altre attività",
};

const categoryOrder = ["commerce", "service", "hospitality", "editorial", "custom"];

export const minimumPublicSearchSuggestionQueryLength = 2;

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

export function normalizeCitySearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("it-IT")
    .replace(/['’`´\-‐‑‒–—―/]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export type CitySearchSuggestions<TCity> = {
  items: TCity[];
  total: number;
  truncated: boolean;
};

const defaultCitySuggestionLimit = 5;

function citySuggestionRank(query: string, city: { slug: string; name: string }) {
  const normalizedName = normalizeCitySearchText(city.name);
  const normalizedSlug = normalizeCitySearchText(city.slug);

  if (normalizedName === query) return 0;
  if (normalizedName.startsWith(query)) return 1;
  if (normalizedName.split(" ").some((word) => word.length > 0 && word.startsWith(query))) return 2;
  if (query.length >= 3 && normalizedName.includes(query)) return 3;
  if (
    normalizedSlug === query ||
    normalizedSlug.startsWith(query) ||
    (query.length >= 3 && normalizedSlug.includes(query))
  )
    return 4;

  return null;
}

export function getCitySearchSuggestions<TCity extends { slug: string; name: string }>(
  query: string,
  cities: readonly TCity[],
  limit = defaultCitySuggestionLimit,
): CitySearchSuggestions<TCity> {
  const normalizedQuery = normalizeCitySearchText(query);

  if (normalizedQuery.length < minimumPublicSearchSuggestionQueryLength) {
    return { items: [], total: 0, truncated: false };
  }

  const ranked = cities
    .map((city, sourceIndex) => ({
      city,
      rank: citySuggestionRank(normalizedQuery, city),
      sourceIndex,
    }))
    .filter(
      (candidate): candidate is { city: TCity; rank: number; sourceIndex: number } =>
        candidate.rank !== null,
    )
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        left.city.name.localeCompare(right.city.name, "it", { sensitivity: "base" }) ||
        left.sourceIndex - right.sourceIndex,
    );
  const seenSlugs = new Set<string>();
  const uniqueMatches = ranked.flatMap(({ city }) => {
    const slugKey = normalizeCitySearchText(city.slug);
    if (seenSlugs.has(slugKey)) return [];
    seenSlugs.add(slugKey);
    return [city];
  });
  const safeLimit = Number.isFinite(limit)
    ? Math.max(0, Math.floor(limit))
    : defaultCitySuggestionLimit;

  return {
    items: uniqueMatches.slice(0, safeLimit),
    total: uniqueMatches.length,
    truncated: uniqueMatches.length > safeLimit,
  };
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
  const normalizedQuery = normalizeCitySearchText(query);

  if (!normalizedQuery) return { status: "empty" };

  const exactMatches = cities.filter(
    (city) => normalizeCitySearchText(city.name) === normalizedQuery,
  );

  if (exactMatches.length === 1) {
    const slug = exactMatches[0]?.slug;
    return slug ? { status: "match", slug } : { status: "unavailable" };
  }
  if (exactMatches.length > 1) return { status: "ambiguous" };

  const partialMatches = getCitySearchSuggestions(query, cities, cities.length);

  if (partialMatches.total === 1) {
    const slug = partialMatches.items[0]?.slug;
    return slug ? { status: "match", slug } : { status: "unavailable" };
  }
  if (partialMatches.total > 1) return { status: "ambiguous" };

  return { status: "unavailable" };
}

export function findMatchingCitySlug(
  query: string,
  cities: readonly { slug: string; name: string }[],
) {
  const resolution = resolveCitySearch(query, cities);
  return resolution.status === "match" ? resolution.slug : null;
}

function getNormalizedBusinessSearchValues(business: SearchableBusiness) {
  return [
    business.name,
    business.summary,
    business.categoryLabel,
    business.area,
    ...(business.categories?.map((category) => category.name) ?? []),
    ...(business.searchTerms ?? []),
  ].map(normalizeSearchText);
}

function getUniqueTrigrams(value: string) {
  const symbols = Array.from(value);
  const trigrams = new Set<string>();

  for (let index = 0; index <= symbols.length - 3; index += 1) {
    trigrams.add(symbols.slice(index, index + 3).join(""));
  }

  return trigrams;
}

function intersectSortedIndices(left: readonly number[], right: readonly number[]): number[] {
  const result: number[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    const leftValue = left[leftIndex];
    const rightValue = right[rightIndex];

    if (leftValue === rightValue) {
      if (leftValue !== undefined) result.push(leftValue);
      leftIndex += 1;
      rightIndex += 1;
    } else if ((leftValue ?? Number.POSITIVE_INFINITY) < (rightValue ?? Number.POSITIVE_INFINITY)) {
      leftIndex += 1;
    } else {
      rightIndex += 1;
    }
  }

  return result;
}

/**
 * Builds an immutable in-memory inverted index for repeated directory queries.
 *
 * Trigram posting lists narrow substring candidates while a final `includes` check preserves the
 * exact semantics of the linear baseline. Queries shorter than three normalized characters use the
 * pre-normalized documents directly because they cannot be represented by a trigram.
 */
export function createPublicBusinessSearchIndex<TBusiness extends CategorizedPublicBusiness>(
  businesses: readonly TBusiness[],
): PublicBusinessSearchIndex<TBusiness> {
  const trigramPostings = new Map<string, number[]>();
  const categoryPostings = new Map<string, number[]>();
  let normalizedFieldCount = 0;

  const normalizedValues = businesses.map((business, businessIndex) => {
    const values = getNormalizedBusinessSearchValues(business);
    normalizedFieldCount += values.length;

    const businessTrigrams = new Set<string>();
    for (const value of values) {
      for (const trigram of getUniqueTrigrams(value)) businessTrigrams.add(trigram);
    }
    for (const trigram of businessTrigrams) {
      const posting = trigramPostings.get(trigram);
      if (posting) posting.push(businessIndex);
      else trigramPostings.set(trigram, [businessIndex]);
    }

    const categoryIds = new Set(
      getPublicBusinessCategories(business).map((category) => category.id),
    );
    for (const categoryId of categoryIds) {
      const posting = categoryPostings.get(categoryId);
      if (posting) posting.push(businessIndex);
      else categoryPostings.set(categoryId, [businessIndex]);
    }

    return values;
  });
  const postingCount = [...trigramPostings.values()].reduce(
    (total, posting) => total + posting.length,
    0,
  );

  return {
    businesses: [...businesses],
    normalizedValues,
    trigramPostings,
    categoryPostings,
    stats: {
      itemCount: businesses.length,
      normalizedFieldCount,
      trigramCount: trigramPostings.size,
      postingCount,
    },
  };
}

function getIndexedTextCandidates<TBusiness extends CategorizedPublicBusiness>(
  index: PublicBusinessSearchIndex<TBusiness>,
  normalizedQuery: string,
) {
  if (!normalizedQuery) {
    return index.businesses.map((_, businessIndex) => businessIndex);
  }

  const trigrams = [...getUniqueTrigrams(normalizedQuery)];
  if (trigrams.length === 0) {
    return index.normalizedValues.flatMap((values, businessIndex) =>
      values.some((value) => value.includes(normalizedQuery)) ? [businessIndex] : [],
    );
  }

  const postings = trigrams
    .map((trigram) => index.trigramPostings.get(trigram))
    .filter((posting): posting is readonly number[] => Boolean(posting))
    .sort((left, right) => left.length - right.length);

  if (postings.length !== trigrams.length || !postings[0]) return [];

  let candidates = [...postings[0]];
  for (const posting of postings.slice(1)) {
    candidates = intersectSortedIndices(candidates, posting);
    if (candidates.length === 0) return [];
  }

  return candidates.filter((businessIndex) =>
    index.normalizedValues[businessIndex]?.some((value) => value.includes(normalizedQuery)),
  );
}

export function searchPublicBusinesses<TBusiness extends CategorizedPublicBusiness>(
  index: PublicBusinessSearchIndex<TBusiness>,
  query: string,
  sectionId = "all",
) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery && sectionId !== "all") {
    return (index.categoryPostings.get(sectionId) ?? []).flatMap((businessIndex) => {
      const business = index.businesses[businessIndex];
      return business ? [business] : [];
    });
  }

  const textCandidates = getIndexedTextCandidates(index, normalizedQuery);
  const selectedIndices =
    sectionId === "all"
      ? textCandidates
      : intersectSortedIndices(textCandidates, index.categoryPostings.get(sectionId) ?? []);

  return selectedIndices.flatMap((businessIndex) => {
    const business = index.businesses[businessIndex];
    return business ? [business] : [];
  });
}

export function filterPublicBusinesses<TBusiness extends SearchableBusiness>(
  businesses: readonly TBusiness[],
  query: string,
) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return [...businesses];

  return businesses.filter((business) =>
    getNormalizedBusinessSearchValues(business).some((value) => value.includes(normalizedQuery)),
  );
}

export function groupPublicBusinessesByCategory<TBusiness extends CategorizedPublicBusiness>(
  businesses: readonly TBusiness[],
): PublicBusinessSection<TBusiness>[] {
  const groups = new Map<string, TBusiness[]>();

  for (const business of businesses) {
    for (const category of getPublicBusinessCategories(business)) {
      const group = groups.get(category.id);
      if (group) group.push(business);
      else groups.set(category.id, [business]);
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
