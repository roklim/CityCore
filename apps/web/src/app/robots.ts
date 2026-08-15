import type { MetadataRoute } from "next";

import { resolvePublicSiteUrl } from "../lib/public-links";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolvePublicSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NODE_ENV,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  );

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/select-access/", "/*/*/admin/"],
    },
    ...(siteUrl ? { sitemap: new URL("/sitemap.xml", siteUrl).toString() } : {}),
  };
}
