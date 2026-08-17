function normalizePublicCopy(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function capitalizeSentence(value: string) {
  if (!value) return value;
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function getContextualBusinessSummary(
  summary: string,
  businessName: string,
  cityName: string,
) {
  const value = normalizePublicCopy(summary);
  if (!value) return value;

  const prefixes = [
    `Scopri ${businessName} a ${cityName}:`,
    `Scopri ${businessName}:`,
    `${businessName} a ${cityName}:`,
    `${businessName}:`,
  ];

  const normalizedValue = value.toLocaleLowerCase("it-IT");
  const matchingPrefix = prefixes.find((prefix) =>
    normalizedValue.startsWith(prefix.toLocaleLowerCase("it-IT")),
  );

  if (!matchingPrefix) return value;

  const contextual = value.slice(matchingPrefix.length).trim();
  return contextual ? capitalizeSentence(contextual) : value;
}
