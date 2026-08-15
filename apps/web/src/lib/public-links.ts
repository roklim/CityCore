export function normalizeExternalUrl(value: string | null) {
  if (!value?.trim()) return null;
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    return ["https:", "http:"].includes(url.protocol) &&
      url.hostname.includes(".") &&
      !url.hostname.endsWith(".test")
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
export function normalizePhoneHref(value: string | null) {
  const number = value?.replace(/[^\d+]/g, "");
  return number && /^\+?\d{5,}$/u.test(number) ? `tel:${number}` : null;
}

export function resolvePublicSiteUrl(
  configuredUrl: string | undefined,
  nodeEnv: string | undefined,
  deploymentHost?: string,
) {
  const normalizedDeploymentHost = deploymentHost?.trim();
  const deploymentUrl = normalizedDeploymentHost
    ? /^[a-z][a-z\d+.-]*:/i.test(normalizedDeploymentHost)
      ? normalizedDeploymentHost
      : `https://${normalizedDeploymentHost}`
    : "";
  const candidate =
    configuredUrl?.trim() ||
    deploymentUrl ||
    (nodeEnv === "development" ? "http://localhost:3000" : "");

  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}
