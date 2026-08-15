"use server";

import { redirect } from "next/navigation";
import {
  type AdminBusinessLookupResponse,
  type AdminCityLookupResponse,
} from "../../lib/admin-lookups";
import { fetchPlatformApi } from "../../lib/platform-api";
import { getWebSession } from "../../lib/web-session";

async function lookupSession() {
  const session = await getWebSession();
  if (!session) redirect("/admin/login");
  if (session.auth.activeAccess.scopeType === "business") {
    redirect(session.auth.redirectTo || "/admin/login");
  }
  return session;
}

export async function searchAdminCitiesAction(query: string, ready = false) {
  const session = await lookupSession();
  const params = new URLSearchParams({
    q: query.trim(),
    ready: String(ready),
    limit: "20",
  });
  const response = await fetchPlatformApi<AdminCityLookupResponse>(
    `/api/v2/platform-core/lookups/cities?${params.toString()}`,
    { token: session.token },
  );
  return response.items;
}

export async function searchAdminBusinessesAction(query: string, citySlug: string) {
  const session = await lookupSession();
  const params = new URLSearchParams({
    q: query.trim(),
    citySlug: citySlug.trim(),
    limit: "20",
  });
  const response = await fetchPlatformApi<AdminBusinessLookupResponse>(
    `/api/v2/platform-core/lookups/businesses?${params.toString()}`,
    { token: session.token },
  );
  return response.items;
}
