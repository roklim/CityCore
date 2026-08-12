"use server";

import { redirect } from "next/navigation";
import { clearSessionToken, getSessionToken, setSessionToken } from "../../lib/web-session";
import { getAdminAuthErrorMessage } from "../../lib/admin-auth-errors";
import { fetchPlatformApi, type AuthSessionResponse } from "../../lib/platform-api";

export type AdminAuthActionState = {
  error: string | null;
};

function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function bootstrapAdminAction(
  _previousState: AdminAuthActionState,
  formData: FormData,
): Promise<AdminAuthActionState> {
  const email = readField(formData, "email");
  const password = readField(formData, "password");
  const name = readField(formData, "name");
  const bootstrapSecret = readField(formData, "bootstrapSecret");

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
        bootstrapSecret: bootstrapSecret || undefined,
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
      error: getAdminAuthErrorMessage(error, "Bootstrap admin non riuscito."),
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

  let redirectTo: string;

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
    redirectTo = response.redirectTo || "/admin";
  } catch (error) {
    return {
      error: getAdminAuthErrorMessage(error, "Login non riuscito."),
    };
  }

  redirect(redirectTo);
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

  let redirectTo: string;

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
    redirectTo = response.redirectTo || "/admin";
  } catch (error) {
    return {
      error: getAdminAuthErrorMessage(error, "Cambio accesso non riuscito."),
    };
  }

  redirect(redirectTo);
}

export async function logoutAction() {
  await clearSessionToken();
  redirect("/admin/login");
}
