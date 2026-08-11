import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { fetchPlatformApi, type PlatformBusinessResponse, PlatformApiError } from "./platform-api";
import { getWebSession } from "./web-session";

export function businessAdminApiPath(citySlug: string, businessSlug: string) {
  return `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}`;
}

export const getBusinessAdminContext = cache(async (citySlug: string, businessSlug: string) => {
  const session = await getWebSession();
  if (!session) redirect("/admin/login");

  try {
    const response = await fetchPlatformApi<PlatformBusinessResponse>(
      businessAdminApiPath(citySlug, businessSlug),
      { token: session.token, cache: "no-store" },
    );
    return { session, business: response.item };
  } catch (error) {
    if (error instanceof PlatformApiError && (error.status === 403 || error.status === 404)) {
      notFound();
    }
    throw error;
  }
});

export type BusinessAdminResponseState<T> =
  | { data: T; failed: false }
  | { data: null; failed: true };

export async function loadBusinessAdminResponse<T>(path: string, token: string) {
  try {
    const data = await fetchPlatformApi<T>(path, { token, cache: "no-store" });
    return { data, failed: false } satisfies BusinessAdminResponseState<T>;
  } catch {
    return { data: null, failed: true } satisfies BusinessAdminResponseState<T>;
  }
}
