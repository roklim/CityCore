export function normalizeCityRegistryQuery(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cityRegistryMatchRank(
  entry: { name: string; asciiName: string | null },
  normalizedQuery: string,
) {
  const normalizedName = normalizeCityRegistryQuery(entry.name);
  const normalizedAsciiName = normalizeCityRegistryQuery(entry.asciiName ?? "");
  if (normalizedName === normalizedQuery || normalizedAsciiName === normalizedQuery) return 0;
  if (
    normalizedName.startsWith(normalizedQuery) ||
    normalizedAsciiName.startsWith(normalizedQuery)
  ) {
    return 1;
  }
  return 2;
}

export function compareCityRegistryMatches(
  left: { name: string; asciiName: string | null; population: number | null },
  right: { name: string; asciiName: string | null; population: number | null },
  normalizedQuery: string,
) {
  const rankDifference =
    cityRegistryMatchRank(left, normalizedQuery) - cityRegistryMatchRank(right, normalizedQuery);
  if (rankDifference) return rankDifference;
  return (right.population ?? 0) - (left.population ?? 0) || left.name.localeCompare(right.name);
}
