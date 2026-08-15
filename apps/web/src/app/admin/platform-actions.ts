"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  fetchPlatformApi,
  type PlatformBusinessResponse,
  type PlatformCityResponse,
  PlatformApiError,
} from "../../lib/platform-api";
import { getWebSession } from "../../lib/web-session";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optional(formData: FormData, key: string) {
  return text(formData, key) || undefined;
}

function returnPath(formData: FormData, fallback: string) {
  const value = text(formData, "returnTo");
  return value === "/admin" || value.startsWith("/admin/") || value.startsWith("/admin?")
    ? value
    : fallback;
}

function friendlyError(error: unknown, conflictMessage?: string) {
  if (error instanceof PlatformApiError) {
    if (error.status === 400) return "Controlla i dati inseriti.";
    if (error.status === 401) return "La sessione è scaduta. Accedi di nuovo.";
    if (error.status === 403) return "Non hai i permessi per completare questa operazione.";
    if (error.status === 404) return "La risorsa richiesta non è più disponibile.";
    if (error.status === 409)
      return conflictMessage ?? "Esiste già una risorsa con gli stessi dati.";
  }
  return "Operazione non disponibile. Riprova tra qualche istante.";
}

async function actionSession() {
  const session = await getWebSession();
  if (!session) redirect("/admin/login");
  if (session.auth.activeAccess.scopeType === "business") {
    redirect(session.auth.redirectTo || "/admin/login");
  }
  return session;
}

function finish(path: string, key: "notice" | "error", message: string): never {
  revalidatePath("/admin");
  revalidatePath("/admin/cities");
  revalidatePath("/admin/businesses");
  revalidatePath("/admin/access");
  revalidatePath("/admin/audit");
  revalidatePath(path.split("?")[0]);
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}${key}=${encodeURIComponent(message)}`);
}

export async function createCityAction(formData: FormData) {
  const session = await actionSession();
  const path = returnPath(formData, "/admin/cities");
  const name = text(formData, "name");
  if (name.length < 2) finish(path, "error", "Inserisci un nome città valido.");

  let response: PlatformCityResponse;
  try {
    response = await fetchPlatformApi<PlatformCityResponse>("/api/v2/platform-core/cities", {
      method: "POST",
      token: session.token,
      body: {
        name,
        slug: optional(formData, "slug"),
        province: optional(formData, "province"),
        region: optional(formData, "region"),
        country: optional(formData, "country")?.toUpperCase(),
        status: text(formData, "status") || "coming_soon",
        active: formData.get("active") === "on",
      },
    });
  } catch (error) {
    finish(path, "error", friendlyError(error));
  }
  revalidatePath("/admin");
  revalidatePath("/admin/cities");
  redirect(
    `/admin/cities/${encodeURIComponent(response.item.slug)}/categories?notice=${encodeURIComponent("Città creata. Ora configura almeno una categoria attiva.")}`,
  );
}

export async function activateRegistryCityAction(formData: FormData) {
  const session = await actionSession();
  const path = returnPath(formData, "/admin/cities");
  let response: PlatformCityResponse;
  try {
    response = await fetchPlatformApi<PlatformCityResponse>("/api/v2/platform-core/cities", {
      method: "POST",
      token: session.token,
      body: {
        registryId: text(formData, "registryId"),
        name: text(formData, "name"),
        slug: text(formData, "slug"),
        province: optional(formData, "province"),
        region: optional(formData, "region"),
        country: optional(formData, "country")?.toUpperCase(),
        status: "coming_soon",
        active: true,
      },
    });
  } catch (error) {
    finish(path, "error", friendlyError(error));
  }
  revalidatePath("/admin");
  revalidatePath("/admin/cities");
  redirect(
    `/admin/cities/${encodeURIComponent(response.item.slug)}/categories?notice=${encodeURIComponent("Città aggiunta. Attivala e crea la prima categoria.")}`,
  );
}

export async function updateCityAction(formData: FormData) {
  const session = await actionSession();
  const path = returnPath(formData, "/admin/cities");
  const citySlug = text(formData, "citySlug");
  if (!citySlug) finish(path, "error", "Città non valida.");

  try {
    await fetchPlatformApi(`/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}`, {
      method: "PATCH",
      token: session.token,
      body: {
        name: text(formData, "name"),
        slug: text(formData, "slug"),
        province: optional(formData, "province") ?? null,
        region: optional(formData, "region") ?? null,
        status: text(formData, "status"),
        active: formData.get("active") === "on",
      },
    });
  } catch (error) {
    finish(path, "error", friendlyError(error));
  }
  finish(path, "notice", "Città aggiornata.");
}

export async function createBusinessAction(formData: FormData) {
  const session = await actionSession();
  const path = returnPath(formData, "/admin/businesses");
  const assignOwner = formData.get("assignOwner") === "on";
  const ownerEmail = optional(formData, "ownerEmail");
  const ownerPassword = optional(formData, "ownerPassword");
  if (assignOwner && (!ownerEmail || !ownerPassword || ownerPassword.length < 12)) {
    finish(
      path,
      "error",
      "Per assegnare il gestore inserisci email e password temporanea di almeno 12 caratteri.",
    );
  }
  let response: PlatformBusinessResponse;
  try {
    response = await fetchPlatformApi<PlatformBusinessResponse>(
      "/api/v2/platform-core/businesses",
      {
        method: "POST",
        token: session.token,
        body: {
          citySlug: text(formData, "citySlug"),
          templateCode: text(formData, "templateCode"),
          name: text(formData, "name"),
          slug: optional(formData, "slug"),
          publicEmail: optional(formData, "publicEmail"),
          publicPhone: optional(formData, "publicPhone"),
          timezone: optional(formData, "timezone"),
          ownerEmail: assignOwner ? ownerEmail : undefined,
          ownerName: assignOwner ? optional(formData, "ownerName") : undefined,
          ownerPhone: assignOwner ? optional(formData, "ownerPhone") : undefined,
          ownerPassword: assignOwner ? ownerPassword : undefined,
          status: "draft",
        },
      },
    );
  } catch (error) {
    finish(path, "error", friendlyError(error));
  }
  revalidatePath("/admin");
  revalidatePath("/admin/businesses");
  redirect(
    `/${encodeURIComponent(response.item.city.slug)}/${encodeURIComponent(response.item.slug)}/admin?notice=${encodeURIComponent("Attività creata in bozza. Segui il percorso guidato per pubblicarla.")}`,
  );
}

function sortOrder(formData: FormData) {
  const value = Number(text(formData, "sortOrder"));
  return Number.isInteger(value) && value >= 0 && value <= 10_000 ? value : 0;
}

export async function createCityCategoryAction(formData: FormData) {
  const session = await actionSession();
  const citySlug = text(formData, "citySlug");
  const path = returnPath(formData, `/admin/cities/${encodeURIComponent(citySlug)}/categories`);
  const name = text(formData, "name");
  if (!citySlug) finish(path, "error", "Città non valida.");
  if (name.length < 2) finish(path, "error", "Inserisci un nome categoria valido.");

  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/categories`,
      {
        method: "POST",
        token: session.token,
        body: {
          name,
          slug: optional(formData, "slug"),
          description: optional(formData, "description"),
          parentId: optional(formData, "parentId"),
          active: formData.get("active") === "on",
          sortOrder: sortOrder(formData),
        },
      },
    );
  } catch (error) {
    finish(path, "error", friendlyError(error, "Esiste già una categoria con questo slug."));
  }
  finish(path, "notice", "Categoria creata. Ora puoi assegnarla alle attività della città.");
}

export async function updateCityCategoryAction(formData: FormData) {
  const session = await actionSession();
  const citySlug = text(formData, "citySlug");
  const categoryId = text(formData, "categoryId");
  const path = returnPath(formData, `/admin/cities/${encodeURIComponent(citySlug)}/categories`);
  if (!citySlug || !categoryId) finish(path, "error", "Categoria non valida.");

  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/categories/${encodeURIComponent(categoryId)}`,
      {
        method: "PATCH",
        token: session.token,
        body: {
          name: text(formData, "name"),
          slug: text(formData, "slug"),
          description: optional(formData, "description") ?? null,
          parentId: optional(formData, "parentId") ?? null,
          active: formData.get("active") === "on",
          sortOrder: sortOrder(formData),
        },
      },
    );
  } catch (error) {
    finish(path, "error", friendlyError(error, "Esiste già una categoria con questo slug."));
  }
  finish(path, "notice", "Categoria aggiornata.");
}

export async function deleteCityCategoryAction(formData: FormData) {
  const session = await actionSession();
  const citySlug = text(formData, "citySlug");
  const categoryId = text(formData, "categoryId");
  const path = returnPath(formData, `/admin/cities/${encodeURIComponent(citySlug)}/categories`);
  if (!citySlug || !categoryId) finish(path, "error", "Categoria non valida.");

  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/categories/${encodeURIComponent(categoryId)}`,
      { method: "DELETE", token: session.token },
    );
  } catch (error) {
    finish(
      path,
      "error",
      friendlyError(
        error,
        "La categoria è già usata o contiene sottocategorie. Disattivala invece di eliminarla.",
      ),
    );
  }
  finish(path, "notice", "Categoria eliminata.");
}

export async function createAccessGrantAction(formData: FormData) {
  const session = await actionSession();
  const path = returnPath(formData, "/admin/access");
  const role = text(formData, "role");
  const password = text(formData, "password");
  if (password.length < 12) {
    finish(path, "error", "Inserisci una password temporanea di almeno 12 caratteri.");
  }
  const scopeType =
    role === "global_admin" ? "platform" : role === "city_admin" ? "city" : "business";
  try {
    await fetchPlatformApi("/api/v2/platform-core/access-grants", {
      method: "POST",
      token: session.token,
      body: {
        userEmail: text(formData, "userEmail"),
        userName: optional(formData, "userName"),
        password,
        role,
        scopeType,
        citySlug: scopeType === "platform" ? undefined : text(formData, "citySlug"),
        businessSlug: scopeType === "business" ? text(formData, "businessSlug") : undefined,
        active: formData.get("active") === "on",
      },
    });
  } catch (error) {
    finish(path, "error", friendlyError(error));
  }
  finish(path, "notice", "Accesso assegnato correttamente.");
}

export async function resetAccessPasswordAction(formData: FormData) {
  const session = await actionSession();
  const path = returnPath(formData, "/admin/access");
  const accessGrantId = text(formData, "accessGrantId");
  const temporaryPassword = text(formData, "temporaryPassword");
  if (!accessGrantId || temporaryPassword.length < 12) {
    finish(path, "error", "Inserisci una password temporanea di almeno 12 caratteri.");
  }
  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/access-grants/${encodeURIComponent(accessGrantId)}`,
      {
        method: "PATCH",
        token: session.token,
        body: { temporaryPassword },
      },
    );
  } catch (error) {
    finish(path, "error", friendlyError(error));
  }
  finish(
    path,
    "notice",
    "Password temporanea impostata. Le sessioni precedenti dell'utente sono state invalidate.",
  );
}

export async function toggleAccessGrantAction(formData: FormData) {
  const session = await actionSession();
  const path = returnPath(formData, "/admin/access");
  const accessGrantId = text(formData, "accessGrantId");
  if (!accessGrantId || accessGrantId === session.auth.activeAccess.id) {
    finish(path, "error", "Non puoi disabilitare l'accesso attualmente in uso.");
  }
  const active = text(formData, "active") === "true";
  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/access-grants/${encodeURIComponent(accessGrantId)}`,
      { method: "PATCH", token: session.token, body: { active } },
    );
  } catch (error) {
    finish(path, "error", friendlyError(error));
  }
  finish(path, "notice", active ? "Accesso riattivato." : "Accesso disabilitato.");
}
