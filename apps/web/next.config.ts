import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

function normalizeHttpUrl(value: string | undefined) {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

function validateProductionEnvironment() {
  if (process.env.NODE_ENV !== "production") return;

  const apiBaseUrl = normalizeHttpUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  if (!apiBaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL must be a valid HTTP(S) URL for a production web build.",
    );
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelProductionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const siteUrl = normalizeHttpUrl(
    configuredSiteUrl || (vercelProductionHost ? `https://${vercelProductionHost}` : undefined),
  );

  if (!siteUrl) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL or VERCEL_PROJECT_PRODUCTION_URL must define the canonical HTTP(S) origin for a production web build.",
    );
  }
}

validateProductionEnvironment();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@platform/config",
    "@platform/domain",
    "@platform/templates",
    "@platform/ui",
  ],
  turbopack: {
    root: join(currentDir, "../.."),
  },
};

export default nextConfig;
