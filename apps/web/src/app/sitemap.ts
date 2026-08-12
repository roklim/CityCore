import type { MetadataRoute } from "next";

import { resolvePublicSiteUrl } from "../lib/public-links";
import { getPublicSitemapData } from "../lib/public-runtime";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = resolvePublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, process.env.NODE_ENV);
  if (!siteUrl) return [];

  const rootEntry: MetadataRoute.Sitemap[number] = {
    url: new URL("/", siteUrl).toString(),
    changeFrequency: "daily",
    priority: 1,
  };

  try {
    const { cities, businesses } = await getPublicSitemapData();
    return [
      rootEntry,
      ...cities.map((city): MetadataRoute.Sitemap[number] => ({
        url: new URL(`/${encodeURIComponent(city.slug)}`, siteUrl).toString(),
        changeFrequency: "daily",
        priority: 0.8,
      })),
      ...businesses.map((business): MetadataRoute.Sitemap[number] => ({
        url: new URL(
          `/${encodeURIComponent(business.citySlug)}/${encodeURIComponent(business.businessSlug)}`,
          siteUrl,
        ).toString(),
        lastModified: business.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      })),
    ];
  } catch {
    return [rootEntry];
  }
}
