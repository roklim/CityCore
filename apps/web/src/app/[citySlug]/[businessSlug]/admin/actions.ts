"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fetchPlatformApi, PlatformApiError } from "../../../../lib/platform-api";
import { getWebSession } from "../../../../lib/web-session";

const orderStatuses = new Set(["new", "accepted", "preparing", "ready", "completed", "cancelled"]);
const serviceStatuses = new Set(["draft", "in_review", "published", "archived"]);
const inquiryStatuses = new Set(["new", "read", "closed"]);

export type BusinessMutationState = { error: string | null; notice: string | null };

function adminPath(citySlug: string, businessSlug: string) {
  return `/${encodeURIComponent(citySlug)}/${encodeURIComponent(businessSlug)}/admin`;
}

function finish(
  citySlug: string,
  businessSlug: string,
  key: "notice" | "error",
  message: string,
): never {
  revalidatePath(adminPath(citySlug, businessSlug));
  redirect(`${adminPath(citySlug, businessSlug)}?${key}=${encodeURIComponent(message)}`);
}

function requiredText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePriceCents(value: FormDataEntryValue | null) {
  const normalized = requiredText(value).replaceAll(" ", "").replace(",", ".");
  if (!/^\d{1,6}(?:\.\d{1,2})?$/u.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return cents > 0 && cents <= 1_000_000 ? cents : null;
}

function messageFor(error: unknown) {
  if (error instanceof PlatformApiError) {
    if (error.status === 403 || error.status === 404)
      return "Non hai l'autorizzazione per modificare questa attività.";
    if (error.status === 409) return "Esiste già una voce con questo nome. Verifica il menu.";
    if (error.status === 400) return "Controlla i dati inseriti e riprova.";
  }
  return "Non è stato possibile salvare la modifica. Riprova.";
}

async function getActionContext(formData: FormData) {
  const citySlug = requiredText(formData.get("citySlug"));
  const businessSlug = requiredText(formData.get("businessSlug"));
  const session = await getWebSession();

  if (!session) {
    redirect("/admin/login");
  }

  return { citySlug, businessSlug, session };
}

export async function updatePickupOrderStatusAction(formData: FormData) {
  const { citySlug, businessSlug, session } = await getActionContext(formData);
  const orderId = requiredText(formData.get("orderId"));
  const status = requiredText(formData.get("status"));
  if (!citySlug || !businessSlug || !orderId || !orderStatuses.has(status)) return;
  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/pickup-orders/${encodeURIComponent(orderId)}`,
      { method: "PATCH", token: session.token, body: { status } },
    );
  } catch (error) {
    const message =
      error instanceof PlatformApiError && error.status === 409
        ? "Questo passaggio di stato non è disponibile."
        : messageFor(error);
    finish(citySlug, businessSlug, "error", message);
  }
  finish(citySlug, businessSlug, "notice", "Stato ordine aggiornato.");
}

export async function updateInquiryStatusAction(formData: FormData) {
  const { citySlug, businessSlug, session } = await getActionContext(formData);
  const inquiryId = requiredText(formData.get("inquiryId"));
  const status = requiredText(formData.get("status"));
  if (!citySlug || !businessSlug || !inquiryId || !inquiryStatuses.has(status)) return;

  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/inquiries/${encodeURIComponent(inquiryId)}`,
      { method: "PATCH", token: session.token, body: { status } },
    );
  } catch (error) {
    const message =
      error instanceof PlatformApiError && error.status === 409
        ? "Questo passaggio di stato non è disponibile."
        : messageFor(error);
    finish(citySlug, businessSlug, "error", message);
  }

  finish(citySlug, businessSlug, "notice", "Stato richiesta aggiornato.");
}

export async function createMenuItemAction(
  _previousState: BusinessMutationState,
  formData: FormData,
): Promise<BusinessMutationState> {
  const { citySlug, businessSlug, session } = await getActionContext(formData);
  const name = requiredText(formData.get("name"));
  const description = requiredText(formData.get("description"));
  const status = requiredText(formData.get("status"));
  const priceCents = parsePriceCents(formData.get("price"));
  if (!citySlug || !businessSlug)
    return { error: "Contesto dell’attività non valido.", notice: null };
  if (name.length < 2 || !priceCents || !serviceStatuses.has(status)) {
    return { error: "Inserisci nome, prezzo e stato validi per la voce.", notice: null };
  }

  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/services`,
      {
        method: "POST",
        token: session.token,
        body: {
          name,
          description: description || null,
          priceCents,
          status,
          sortOrder: 0,
        },
      },
    );
  } catch (error) {
    return { error: messageFor(error), notice: null };
  }
  revalidatePath(adminPath(citySlug, businessSlug));
  revalidatePath(`/${encodeURIComponent(citySlug)}/${encodeURIComponent(businessSlug)}`);
  return { error: null, notice: "Voce del menu aggiunta." };
}

export async function updateMenuItemAction(
  _previousState: BusinessMutationState,
  formData: FormData,
): Promise<BusinessMutationState> {
  const { citySlug, businessSlug, session } = await getActionContext(formData);
  const serviceId = requiredText(formData.get("serviceId"));
  const name = requiredText(formData.get("name"));
  const description = requiredText(formData.get("description"));
  const status = requiredText(formData.get("status"));
  const priceCents = parsePriceCents(formData.get("price"));
  if (!citySlug || !businessSlug || !serviceId)
    return { error: "Voce del menu non valida.", notice: null };
  if (name.length < 2 || !priceCents || !serviceStatuses.has(status)) {
    return { error: "Inserisci nome, prezzo e stato validi per la voce.", notice: null };
  }

  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/services/${encodeURIComponent(serviceId)}`,
      {
        method: "PATCH",
        token: session.token,
        body: { name, description: description || null, priceCents, status },
      },
    );
  } catch (error) {
    return { error: messageFor(error), notice: null };
  }
  revalidatePath(adminPath(citySlug, businessSlug));
  revalidatePath(`/${encodeURIComponent(citySlug)}/${encodeURIComponent(businessSlug)}`);
  return { error: null, notice: "Voce del menu aggiornata." };
}

export async function createMenuItemProgressiveAction(formData: FormData) {
  const citySlug = requiredText(formData.get("citySlug"));
  const businessSlug = requiredText(formData.get("businessSlug"));
  if (!citySlug || !businessSlug) redirect("/admin");

  const result = await createMenuItemAction({ error: null, notice: null }, formData);
  if (result.error) finish(citySlug, businessSlug, "error", result.error);
  finish(citySlug, businessSlug, "notice", result.notice ?? "Voce del menu aggiunta.");
}

export async function updateMenuItemProgressiveAction(formData: FormData) {
  const citySlug = requiredText(formData.get("citySlug"));
  const businessSlug = requiredText(formData.get("businessSlug"));
  if (!citySlug || !businessSlug) redirect("/admin");

  const result = await updateMenuItemAction({ error: null, notice: null }, formData);
  if (result.error) finish(citySlug, businessSlug, "error", result.error);
  finish(citySlug, businessSlug, "notice", result.notice ?? "Voce del menu aggiornata.");
}

export async function updateBusinessModulesAction(formData: FormData) {
  const { citySlug, businessSlug, session } = await getActionContext(formData);
  const moduleCodes = formData
    .getAll("moduleCodes")
    .filter((value): value is string => typeof value === "string");
  if (!citySlug || !businessSlug) return;

  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/modules`,
      { method: "PUT", token: session.token, body: { moduleCodes } },
    );
  } catch (error) {
    finish(citySlug, businessSlug, "error", messageFor(error));
  }
  finish(citySlug, businessSlug, "notice", "Moduli aggiornati.");
}
