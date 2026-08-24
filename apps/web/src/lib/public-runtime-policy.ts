export function shouldUseEditorialFallback(
  nodeEnv = process.env.NODE_ENV,
  configuredValue = process.env.CITYCORE_ENABLE_EDITORIAL_FALLBACK,
) {
  const configured = configuredValue?.trim().toLowerCase();

  if (configured) {
    return configured === "true";
  }

  return nodeEnv !== "production";
}
