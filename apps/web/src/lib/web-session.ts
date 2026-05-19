import { cookies } from "next/headers";
import { fetchPlatformApi, type AuthSessionResponse, PlatformApiError } from "./platform-api";

const sessionCookieName = "citycore_session";

export type WebSession = {
  token: string;
  auth: AuthSessionResponse;
};

export async function getSessionToken() {
  return (await cookies()).get(sessionCookieName)?.value ?? null;
}

export async function setSessionToken(token: string) {
  (await cookies()).set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSessionToken() {
  (await cookies()).delete(sessionCookieName);
}

export async function getWebSession(): Promise<WebSession | null> {
  const token = await getSessionToken();

  if (!token) {
    return null;
  }

  try {
    const auth = await fetchPlatformApi<AuthSessionResponse>("/api/v2/auth/me", {
      token,
      cache: "no-store",
    });

    return {
      token,
      auth,
    };
  } catch (error) {
    if (error instanceof PlatformApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}
