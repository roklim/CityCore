function normalizePublicCopy(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function capitalizeSentence(value: string) {
  if (!value) return value;
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function getBusinessNameAliases(businessName: string) {
  const normalizedName = normalizePublicCopy(businessName);
  const aliases = new Set([normalizedName]);

  for (const separator of [" · ", " | ", " — "]) {
    const [primaryName] = normalizedName.split(separator);
    if (primaryName?.trim()) aliases.add(primaryName.trim());
  }

  return Array.from(aliases).sort((left, right) => right.length - left.length);
}

export function getContextualBusinessSummary(
  summary: string,
  businessName: string,
  cityName: string,
) {
  const value = normalizePublicCopy(summary);
  if (!value) return value;

  const prefixes = getBusinessNameAliases(businessName).flatMap((name) => [
    `Scopri ${name} a ${cityName}:`,
    `Scopri ${name}:`,
    `${name} a ${cityName}:`,
    `${name}:`,
  ]);

  const normalizedValue = value.toLocaleLowerCase("it-IT");
  const matchingPrefix = prefixes.find((prefix) =>
    normalizedValue.startsWith(prefix.toLocaleLowerCase("it-IT")),
  );

  if (!matchingPrefix) return value;

  const contextual = value.slice(matchingPrefix.length).trim();
  return contextual ? capitalizeSentence(contextual) : value;
}
