import { redirect } from "next/navigation";
import { fetchPlatformApi } from "./platform-api";
import { getWebSession } from "./web-session";

export async function requirePlatformAdminSession() {
  const session = await getWebSession();
  if (!session) redirect("/admin/login");
  if (session.auth.activeAccess.scopeType === "business") {
    redirect(session.auth.redirectTo || "/admin/login");
  }
  return session;
}

type AdminResponseState<TResponse> =
  | { data: TResponse; failed: false }
  | { data: null; failed: true };

export async function loadAdminResponse<TResponse>(path: string, token: string) {
  try {
    const data = await fetchPlatformApi<TResponse>(path, { token, cache: "no-store" });
    return { data, failed: false } satisfies AdminResponseState<TResponse>;
  } catch {
    return { data: null, failed: true } satisfies AdminResponseState<TResponse>;
  }
}
