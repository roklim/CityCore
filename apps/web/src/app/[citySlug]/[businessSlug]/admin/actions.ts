"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  fetchPlatformApi,
  type PlatformBusinessResponse,
  PlatformApiError,
} from "../../../../lib/platform-api";
import {
  buildOpeningWeekPayload,
  buildSocialLinksFromForm,
  validateOpeningWeek,
} from "../../../../lib/business-admin-logic";
import { getWebSession } from "../../../../lib/web-session";

const orderStatuses = new Set(["new", "accepted", "preparing", "ready", "completed", "cancelled"]);
const serviceStatuses = new Set(["draft", "in_review", "published", "archived"]);
const inquiryStatuses = new Set(["new", "read", "closed"]);

export type BusinessMutationState = {
  error: string | null;
  notice: string | null;
  nextBusinessSlug?: string;
};

function adminPath(citySlug: string, businessSlug: string) {
  return `/${encodeURIComponent(citySlug)}/${encodeURIComponent(businessSlug)}/admin`;
}

function returnPath(formData: FormData, citySlug: string, businessSlug: string, section: string) {
  const fallback = `${adminPath(citySlug, businessSlug)}/${section}`;
  const value = requiredText(formData.get("returnTo"));
  return value === fallback || value.startsWith(`${fallback}?`) ? value : fallback;
}

function finish(
  formData: FormData,
  citySlug: string,
  businessSlug: string,
  section: string,
  key: "notice" | "error",
  message: string,
): never {
  revalidatePath(adminPath(citySlug, businessSlug), "layout");
  const path = returnPath(formData, citySlug, businessSlug, section);
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}${key}=${encodeURIComponent(message)}`);
}

function requiredText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePriceCents(value: FormDataEntryValue | null) {
  if (!requiredText(value)) return null;
  const normalized = requiredText(value).replaceAll(" ", "").replace(",", ".");
  if (!/^\d{1,6}(?:\.\d{1,2})?$/u.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return cents > 0 && cents <= 1_000_000 ? cents : null;
}

function parseNonNegativePriceCents(value: FormDataEntryValue | null) {
  const normalized = requiredText(value).replaceAll(" ", "").replace(",", ".");
  if (!/^\d{1,6}(?:\.\d{1,2})?$/u.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return cents >= 0 && cents <= 1_000_000 ? cents : null;
}

function boundedInteger(value: FormDataEntryValue | null, minimum: number, maximum: number) {
  const parsed = Number(requiredText(value));
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function optionalText(value: FormDataEntryValue | null) {
  return requiredText(value) || null;
}

function optionalPositiveInteger(value: FormDataEntryValue | null, maximum: number) {
  const normalized = requiredText(value);
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : undefined;
}

function parseSortOrder(value: FormDataEntryValue | null) {
  const parsed = Number(requiredText(value));
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 10_000 ? parsed : null;
}

function messageFor(error: unknown) {
  if (error instanceof PlatformApiError) {
    if (error.status === 400) return "Dati non validi.";
    if (error.status === 401) return "Sessione scaduta.";
    if (error.status === 403) return "Non hai i permessi necessari.";
    if (error.status === 404) return "Attività non trovata.";
    if (error.status === 409) return "Il valore è già utilizzato.";
  }
  return "Operazione non disponibile in questo momento.";
}

async function getActionContext(formData: FormData) {
  const citySlug = requiredText(formData.get("citySlug"));
  const businessSlug = requiredText(formData.get("businessSlug"));
  const session = await getWebSession();

  if (!session) {
    redirect("/admin/login");
  }

  if (!citySlug || !businessSlug) {
    redirect("/admin");
  }

  return { citySlug, businessSlug, session };
}

function revalidateBusinessSurfaces(citySlug: string, businessSlug: string) {
  revalidatePath("/");
  revalidatePath(`/${encodeURIComponent(citySlug)}`);
  revalidatePath(`/${encodeURIComponent(citySlug)}/${encodeURIComponent(businessSlug)}`);
  revalidatePath(adminPath(citySlug, businessSlug), "layout");
}

export async function updateBusinessProfileAction(
  _previousState: BusinessMutationState,
  formData: FormData,
): Promise<BusinessMutationState> {
  const { citySlug, businessSlug, session } = await getActionContext(formData);
  const name = requiredText(formData.get("name"));
  const nextBusinessSlug = requiredText(formData.get("slug"));
  const isPublished = requiredText(formData.get("businessStatus")) === "active";
  if (name.length < 2 || !nextBusinessSlug) {
    return { error: "Dati non validi.", notice: null };
  }

  const body = {
    name,
    ...(!isPublished ? { slug: nextBusinessSlug } : {}),
    publicTitle: optionalText(formData.get("publicTitle")),
    publicSubtitle: optionalText(formData.get("publicSubtitle")),
    publicDescription: optionalText(formData.get("publicDescription")),
    publicPhone: optionalText(formData.get("publicPhone")),
    publicEmail: optionalText(formData.get("publicEmail")),
    website: optionalText(formData.get("website")),
    addressLine1: optionalText(formData.get("addressLine1")),
    addressLine2: optionalText(formData.get("addressLine2")),
    postalCode: optionalText(formData.get("postalCode")),
    locality: optionalText(formData.get("locality")),
    province: optionalText(formData.get("province")),
    timezone: requiredText(formData.get("timezone")),
    currency: requiredText(formData.get("currency")),
    locale: requiredText(formData.get("locale")),
    socialLinks: buildSocialLinksFromForm(formData),
  };

  let updatedBusinessSlug: string;
  try {
    const response = await fetchPlatformApi<PlatformBusinessResponse>(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}`,
      { method: "PATCH", token: session.token, body },
    );
    updatedBusinessSlug = response.item.slug;
  } catch (error) {
    return { error: messageFor(error), notice: null };
  }

  revalidateBusinessSurfaces(citySlug, businessSlug);
  if (updatedBusinessSlug !== businessSlug) {
    revalidateBusinessSurfaces(citySlug, updatedBusinessSlug);
  }
  return { error: null, notice: "Profilo aggiornato.", nextBusinessSlug: updatedBusinessSlug };
}

export async function updateBusinessCategoriesAction(formData: FormData) {
  const { citySlug, businessSlug, session } = await getActionContext(formData);
  const categoryIds = formData
    .getAll("categoryIds")
    .filter((value): value is string => typeof value === "string" && Boolean(value));
  const primaryCategoryId = requiredText(formData.get("primaryCategoryId"));
  if (!categoryIds.length) {
    finish(
      formData,
      citySlug,
      businessSlug,
      "categories",
      "error",
      "Seleziona almeno una categoria attiva.",
    );
  }
  if (!primaryCategoryId || !categoryIds.includes(primaryCategoryId)) {
    finish(
      formData,
      citySlug,
      businessSlug,
      "categories",
      "error",
      "Scegli una categoria primaria tra quelle selezionate.",
    );
  }

  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/categories`,
      { method: "PUT", token: session.token, body: { categoryIds, primaryCategoryId } },
    );
  } catch (error) {
    finish(formData, citySlug, businessSlug, "categories", "error", messageFor(error));
  }
  revalidateBusinessSurfaces(citySlug, businessSlug);
  finish(formData, citySlug, businessSlug, "categories", "notice", "Categorie aggiornate.");
}

export async function updateOpeningHoursAction(
  _previousState: BusinessMutationState,
  formData: FormData,
): Promise<BusinessMutationState> {
  const { citySlug, businessSlug, session } = await getActionContext(formData);
  const payload = buildOpeningWeekPayload(formData);
  const errors = validateOpeningWeek(payload.days);
  if (errors.length) return { error: errors[0], notice: null };

  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/opening-hours`,
      { method: "PUT", token: session.token, body: payload },
    );
  } catch (error) {
    return { error: messageFor(error), notice: null };
  }
  revalidatePath(adminPath(citySlug, businessSlug), "layout");
  revalidatePath(`/${encodeURIComponent(citySlug)}/${encodeURIComponent(businessSlug)}`);
  return { error: null, notice: "Orari aggiornati." };
}

export async function publishBusinessAction(formData: FormData) {
  const { citySlug, businessSlug, session } = await getActionContext(formData);
  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/publish`,
      { method: "POST", token: session.token },
    );
  } catch (error) {
    finish(formData, citySlug, businessSlug, "publication", "error", messageFor(error));
  }
  revalidateBusinessSurfaces(citySlug, businessSlug);
  finish(formData, citySlug, businessSlug, "publication", "notice", "Attività pubblicata.");
}

export async function unpublishBusinessAction(formData: FormData) {
  const { citySlug, businessSlug, session } = await getActionContext(formData);
  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/unpublish`,
      { method: "POST", token: session.token },
    );
  } catch (error) {
    finish(formData, citySlug, businessSlug, "publication", "error", messageFor(error));
  }
  revalidateBusinessSurfaces(citySlug, businessSlug);
  finish(
    formData,
    citySlug,
    businessSlug,
    "publication",
    "notice",
    "Attività rimossa dalla directory pubblica.",
  );
}

export async function updatePickupOrderStatusAction(formData: FormData) {
  const { citySlug, businessSlug, session } = await getActionContext(formData);
  const orderId = requiredText(formData.get("orderId"));
  const status = requiredText(formData.get("status"));
  if (!citySlug || !businessSlug || !orderId || !orderStatuses.has(status)) {
    finish(formData, citySlug, businessSlug, "orders", "error", "Dati ordine non validi.");
  }
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
    finish(formData, citySlug, businessSlug, "orders", "error", message);
  }
  finish(formData, citySlug, businessSlug, "orders", "notice", "Stato ordine aggiornato.");
}

export async function updatePickupOrderingAction(formData: FormData) {
  const { citySlug, businessSlug, session } = await getActionContext(formData);
  const pickupLeadMinutes = boundedInteger(formData.get("pickupLeadMinutes"), 0, 720);
  const slotMinutes = boundedInteger(formData.get("slotMinutes"), 5, 120);
  const slotCapacity = boundedInteger(formData.get("slotCapacity"), 1, 100);
  const minimumOrderCents = parseNonNegativePriceCents(formData.get("minimumOrder"));
  if (
    pickupLeadMinutes === null ||
    slotMinutes === null ||
    slotCapacity === null ||
    minimumOrderCents === null
  ) {
    finish(formData, citySlug, businessSlug, "orders", "error", "Impostazioni non valide.");
  }
  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/pickup-ordering`,
      {
        method: "PUT",
        token: session.token,
        body: {
          enabled: formData.get("enabled") === "on",
          pickupLeadMinutes,
          slotMinutes,
          slotCapacity,
          minimumOrderCents,
        },
      },
    );
  } catch (error) {
    finish(formData, citySlug, businessSlug, "orders", "error", messageFor(error));
  }
  revalidatePath(adminPath(citySlug, businessSlug), "layout");
  finish(formData, citySlug, businessSlug, "orders", "notice", "Ritiro aggiornato.");
}

export async function updateInquiryStatusAction(formData: FormData) {
  const { citySlug, businessSlug, session } = await getActionContext(formData);
  const inquiryId = requiredText(formData.get("inquiryId"));
  const status = requiredText(formData.get("status"));
  const internalNote = optionalText(formData.get("internalNote"));
  if (!citySlug || !businessSlug || !inquiryId || (status && !inquiryStatuses.has(status))) {
    finish(formData, citySlug, businessSlug, "inquiries", "error", "Dati richiesta non validi.");
  }

  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/inquiries/${encodeURIComponent(inquiryId)}`,
      {
        method: "PATCH",
        token: session.token,
        body: { ...(status ? { status } : {}), internalNote },
      },
    );
  } catch (error) {
    const message =
      error instanceof PlatformApiError && error.status === 409
        ? "Questo passaggio di stato non è disponibile."
        : messageFor(error);
    finish(formData, citySlug, businessSlug, "inquiries", "error", message);
  }

  finish(
    formData,
    citySlug,
    businessSlug,
    "inquiries",
    "notice",
    status ? "Stato richiesta aggiornato." : "Nota interna salvata.",
  );
}

export async function createMenuItemAction(
  _previousState: BusinessMutationState,
  formData: FormData,
): Promise<BusinessMutationState> {
  const { citySlug, businessSlug, session } = await getActionContext(formData);
  const name = requiredText(formData.get("name"));
  const slug = optionalText(formData.get("slug"));
  const shortDescription = optionalText(formData.get("shortDescription"));
  const description = optionalText(formData.get("description"));
  const priceLabel = optionalText(formData.get("priceLabel"));
  const status = requiredText(formData.get("status"));
  const priceCents = parsePriceCents(formData.get("price"));
  const durationMinutes = optionalPositiveInteger(formData.get("durationMinutes"), 1_440);
  const serviceSortOrder = parseSortOrder(formData.get("sortOrder"));
  if (!citySlug || !businessSlug)
    return { error: "Contesto dell’attività non valido.", notice: null };
  if (
    name.length < 2 ||
    (requiredText(formData.get("price")) && !priceCents) ||
    durationMinutes === undefined ||
    serviceSortOrder === null ||
    !serviceStatuses.has(status)
  ) {
    return { error: "Inserisci dati validi per il servizio.", notice: null };
  }

  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/services`,
      {
        method: "POST",
        token: session.token,
        body: {
          name,
          ...(slug ? { slug } : {}),
          shortDescription,
          description,
          priceLabel,
          priceCents,
          durationMinutes,
          pickupEnabled: formData.get("pickupEnabled") === "on",
          status,
          sortOrder: serviceSortOrder,
        },
      },
    );
  } catch (error) {
    return { error: messageFor(error), notice: null };
  }
  revalidatePath(adminPath(citySlug, businessSlug), "layout");
  revalidatePath(`/${encodeURIComponent(citySlug)}/${encodeURIComponent(businessSlug)}`);
  return { error: null, notice: "Servizio creato." };
}

export async function updateMenuItemAction(
  _previousState: BusinessMutationState,
  formData: FormData,
): Promise<BusinessMutationState> {
  const { citySlug, businessSlug, session } = await getActionContext(formData);
  const serviceId = requiredText(formData.get("serviceId"));
  const name = requiredText(formData.get("name"));
  const slug = optionalText(formData.get("slug"));
  const shortDescription = optionalText(formData.get("shortDescription"));
  const description = optionalText(formData.get("description"));
  const priceLabel = optionalText(formData.get("priceLabel"));
  const status = requiredText(formData.get("status"));
  const priceCents = parsePriceCents(formData.get("price"));
  const durationMinutes = optionalPositiveInteger(formData.get("durationMinutes"), 1_440);
  const serviceSortOrder = parseSortOrder(formData.get("sortOrder"));
  if (!citySlug || !businessSlug || !serviceId)
    return { error: "Voce del menu non valida.", notice: null };
  if (
    name.length < 2 ||
    (requiredText(formData.get("price")) && !priceCents) ||
    durationMinutes === undefined ||
    serviceSortOrder === null ||
    !serviceStatuses.has(status)
  ) {
    return { error: "Inserisci dati validi per il servizio.", notice: null };
  }

  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/services/${encodeURIComponent(serviceId)}`,
      {
        method: "PATCH",
        token: session.token,
        body: {
          name,
          ...(slug ? { slug } : {}),
          shortDescription,
          description,
          priceLabel,
          priceCents,
          durationMinutes,
          pickupEnabled: formData.get("pickupEnabled") === "on",
          status,
          sortOrder: serviceSortOrder,
        },
      },
    );
  } catch (error) {
    return { error: messageFor(error), notice: null };
  }
  revalidatePath(adminPath(citySlug, businessSlug), "layout");
  revalidatePath(`/${encodeURIComponent(citySlug)}/${encodeURIComponent(businessSlug)}`);
  return { error: null, notice: "Servizio aggiornato." };
}

export async function createMenuItemProgressiveAction(formData: FormData) {
  const citySlug = requiredText(formData.get("citySlug"));
  const businessSlug = requiredText(formData.get("businessSlug"));
  if (!citySlug || !businessSlug) redirect("/admin");

  const result = await createMenuItemAction({ error: null, notice: null }, formData);
  if (result.error) finish(formData, citySlug, businessSlug, "services", "error", result.error);
  finish(
    formData,
    citySlug,
    businessSlug,
    "services",
    "notice",
    result.notice ?? "Servizio creato.",
  );
}

export async function updateMenuItemProgressiveAction(formData: FormData) {
  const citySlug = requiredText(formData.get("citySlug"));
  const businessSlug = requiredText(formData.get("businessSlug"));
  if (!citySlug || !businessSlug) redirect("/admin");

  const result = await updateMenuItemAction({ error: null, notice: null }, formData);
  if (result.error) finish(formData, citySlug, businessSlug, "services", "error", result.error);
  finish(
    formData,
    citySlug,
    businessSlug,
    "services",
    "notice",
    result.notice ?? "Servizio aggiornato.",
  );
}

export async function archiveMenuItemAction(formData: FormData) {
  const { citySlug, businessSlug, session } = await getActionContext(formData);
  const serviceId = requiredText(formData.get("serviceId"));
  if (!serviceId) {
    finish(formData, citySlug, businessSlug, "services", "error", "Dati non validi.");
  }

  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/services/${encodeURIComponent(serviceId)}`,
      { method: "PATCH", token: session.token, body: { status: "archived" } },
    );
  } catch (error) {
    finish(formData, citySlug, businessSlug, "services", "error", messageFor(error));
  }
  revalidateBusinessSurfaces(citySlug, businessSlug);
  finish(formData, citySlug, businessSlug, "services", "notice", "Servizio archiviato.");
}

export async function deleteMenuItemAction(formData: FormData) {
  const { citySlug, businessSlug, session } = await getActionContext(formData);
  const serviceId = requiredText(formData.get("serviceId"));
  if (!serviceId) finish(formData, citySlug, businessSlug, "services", "error", "Dati non validi.");
  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/services/${encodeURIComponent(serviceId)}`,
      { method: "DELETE", token: session.token },
    );
  } catch (error) {
    finish(formData, citySlug, businessSlug, "services", "error", messageFor(error));
  }
  revalidateBusinessSurfaces(citySlug, businessSlug);
  finish(formData, citySlug, businessSlug, "services", "notice", "Servizio eliminato.");
}

export async function updateBusinessModulesAction(formData: FormData) {
  const { citySlug, businessSlug, session } = await getActionContext(formData);
  const moduleCodes = formData
    .getAll("moduleCodes")
    .filter((value): value is string => typeof value === "string");
  if (!citySlug || !businessSlug) {
    finish(formData, citySlug, businessSlug, "modules", "error", "Contesto attività non valido.");
  }

  try {
    await fetchPlatformApi(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/modules`,
      { method: "PUT", token: session.token, body: { moduleCodes } },
    );
  } catch (error) {
    finish(formData, citySlug, businessSlug, "modules", "error", messageFor(error));
  }
  finish(formData, citySlug, businessSlug, "modules", "notice", "Moduli aggiornati.");
}
