"use server";

import { redirect } from "next/navigation";
import { clearSessionToken, getSessionToken, setSessionToken } from "../../lib/web-session";
import {
  fetchPlatformApi,
  type AuthSessionResponse,
  PlatformApiError,
} from "../../lib/platform-api";

export type AdminAuthActionState = {
  error: string | null;
};

function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function mapApiError(error: unknown, fallback: string) {
  if (error instanceof PlatformApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export async function bootstrapAdminAction(
  _previousState: AdminAuthActionState,
  formData: FormData,
): Promise<AdminAuthActionState> {
  const email = readField(formData, "email");
  const password = readField(formData, "password");
  const name = readField(formData, "name");

  if (!email || !password) {
    return {
      error: "Email e password sono obbligatori.",
    };
  }

  try {
    const response = await fetchPlatformApi<AuthSessionResponse>("/api/v2/auth/bootstrap-admin", {
      method: "POST",
      body: {
        email,
        password,
        name: name || undefined,
      },
    });

    if (!response.token) {
      return {
        error: "Bootstrap completato ma token sessione mancante.",
      };
    }

    await setSessionToken(response.token);
  } catch (error) {
    return {
      error: mapApiError(error, "Bootstrap admin non riuscito."),
    };
  }

  redirect("/admin");
}

export async function loginAction(
  _previousState: AdminAuthActionState,
  formData: FormData,
): Promise<AdminAuthActionState> {
  const email = readField(formData, "email");
  const password = readField(formData, "password");

  if (!email || !password) {
    return {
      error: "Email e password sono obbligatori.",
    };
  }

  try {
    const response = await fetchPlatformApi<AuthSessionResponse>("/api/v2/auth/login", {
      method: "POST",
      body: {
        email,
        password,
      },
    });

    if (!response.token) {
      return {
        error: "Login riuscito ma token sessione mancante.",
      };
    }

    await setSessionToken(response.token);
    redirect(response.redirectTo || "/admin");
  } catch (error) {
    return {
      error: mapApiError(error, "Login non riuscito."),
    };
  }
}

export async function selectAccessAction(
  _previousState: AdminAuthActionState,
  formData: FormData,
): Promise<AdminAuthActionState> {
  const accessGrantId = readField(formData, "accessGrantId");

  if (!accessGrantId) {
    return {
      error: "Seleziona un accesso valido.",
    };
  }

  try {
    const token = await getSessionToken();

    if (!token) {
      return {
        error: "Sessione mancante. Rifai login.",
      };
    }

    const response = await fetchPlatformApi<AuthSessionResponse>("/api/v2/auth/select-access", {
      method: "POST",
      token,
      body: {
        accessGrantId,
      },
    });

    if (!response.token) {
      return {
        error: "Cambio accesso riuscito ma token sessione mancante.",
      };
    }

    await setSessionToken(response.token);
    redirect(response.redirectTo || "/admin");
  } catch (error) {
    return {
      error: mapApiError(error, "Cambio accesso non riuscito."),
    };
  }
}

export async function logoutAction() {
  await clearSessionToken();
  redirect("/admin/login");
}
