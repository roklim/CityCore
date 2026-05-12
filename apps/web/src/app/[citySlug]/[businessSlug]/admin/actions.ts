"use server";

import { redirect } from "next/navigation";
import {
  fetchV2Api,
  type AdminOrderingMenuItemResponse,
  type PublicOrderingOrderResponse,
  V2ApiError,
} from "../../../../lib/v2-api";
import { getWebSession } from "../../../../lib/v2-session";

function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseDelimitedList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseSpecialDates(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [date, second = "", third = "", fourth = "", fifth = "", sixth = ""] = line
        .split("|")
        .map((entry) => entry.trim());

      if (second.toLowerCase() === "closed") {
        return {
          date,
          closed: true,
        };
      }

      return {
        date,
        closed: false,
        openingTimeStart: second || undefined,
        openingTimeEnd: third || undefined,
        slotMinutes: fourth ? Number(fourth) : undefined,
        maxOrdersPerSlot: fifth ? Number(fifth) : undefined,
        minPreparationMinutes: sixth ? Number(sixth) : undefined,
      };
    });
}

function readRouteContext(formData: FormData) {
  const citySlug = readField(formData, "citySlug");
  const businessSlug = readField(formData, "businessSlug");
  const routePath = readField(formData, "routePath") || `/${citySlug}/${businessSlug}/admin`;

  return {
    citySlug,
    businessSlug,
    routePath,
  };
}

function mapApiError(error: unknown) {
  if (error instanceof V2ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Aggiornamento stato non riuscito.";
}

export async function updateOrderingStatusAction(formData: FormData) {
  const { citySlug, businessSlug, routePath } = readRouteContext(formData);
  const orderId = readField(formData, "orderId");
  const status = readField(formData, "status");

  const session = await getWebSession();

  if (!session) {
    redirect("/admin/login");
  }

  try {
    await fetchV2Api<PublicOrderingOrderResponse>(
      `/api/v2/ordering/businesses/${citySlug}/${businessSlug}/orders/${orderId}/status`,
      {
        method: "PATCH",
        token: session.token,
        body: {
          status,
        },
      },
    );
  } catch (error) {
    const message = encodeURIComponent(mapApiError(error));
    redirect(`${routePath}?orderingError=${message}`);
  }

  redirect(`${routePath}?orderingSuccess=1`);
}

export async function saveOrderingSettingsAction(formData: FormData) {
  const { citySlug, businessSlug, routePath } = readRouteContext(formData);
  const openingDays = formData
    .getAll("openingDays")
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  const session = await getWebSession();

  if (!session) {
    redirect("/admin/login");
  }

  try {
    await fetchV2Api(`/api/v2/ordering/businesses/${citySlug}/${businessSlug}/settings`, {
      method: "PUT",
      token: session.token,
      body: {
        openingHours: readField(formData, "openingHours") || undefined,
        openingDays,
        openingTimeStart: readField(formData, "openingTimeStart") || undefined,
        openingTimeEnd: readField(formData, "openingTimeEnd") || undefined,
        deliveryCost: Number(readField(formData, "deliveryCost") || 0),
        minimumOrder: Number(readField(formData, "minimumOrder") || 0),
        slotMinutes: Number(readField(formData, "slotMinutes") || 15),
        maxOrdersPerSlot: Number(readField(formData, "maxOrdersPerSlot") || 4),
        minPreparationMinutes: Number(readField(formData, "minPreparationMinutes") || 30),
        closedDates: parseDelimitedList(readField(formData, "closedDates")),
        specialDates: parseSpecialDates(readField(formData, "specialDates")),
        serviceZones: readField(formData, "serviceZones")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        customerMessage: readField(formData, "customerMessage") || undefined,
      },
    });
  } catch (error) {
    const message = encodeURIComponent(mapApiError(error));
    redirect(`${routePath}?settingsError=${message}`);
  }

  redirect(`${routePath}?settingsSuccess=1`);
}

export async function createOrderingCouponAction(formData: FormData) {
  const { citySlug, businessSlug, routePath } = readRouteContext(formData);
  const session = await getWebSession();

  if (!session) {
    redirect("/admin/login");
  }

  try {
    await fetchV2Api(`/api/v2/ordering/businesses/${citySlug}/${businessSlug}/coupons`, {
      method: "POST",
      token: session.token,
      body: {
        code: readField(formData, "code"),
        type: readField(formData, "type"),
        value: Number(readField(formData, "value") || 0),
        expiresAt: readField(formData, "expiresAt")
          ? new Date(readField(formData, "expiresAt")).toISOString()
          : undefined,
        usageLimit: Number(readField(formData, "usageLimit") || 0),
        active: formData.get("active") === "on",
      },
    });
  } catch (error) {
    const message = encodeURIComponent(mapApiError(error));
    redirect(`${routePath}?couponError=${message}`);
  }

  redirect(`${routePath}?couponSuccess=1`);
}

function readListField(formData: FormData, key: string) {
  return readField(formData, key)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function createOrderingMenuCategoryAction(formData: FormData) {
  const { citySlug, businessSlug, routePath } = readRouteContext(formData);
  const session = await getWebSession();

  if (!session) {
    redirect("/admin/login");
  }

  try {
    await fetchV2Api(`/api/v2/ordering/businesses/${citySlug}/${businessSlug}/categories`, {
      method: "POST",
      token: session.token,
      body: {
        name: readField(formData, "name"),
        slug: readField(formData, "slug") || undefined,
        sortOrder: Number(readField(formData, "sortOrder") || 0),
        active: formData.get("active") === "on",
      },
    });
  } catch (error) {
    const message = encodeURIComponent(mapApiError(error));
    redirect(`${routePath}?menuError=${message}#menu-manager`);
  }

  redirect(`${routePath}?menuSuccess=category#menu-manager`);
}

export async function saveOrderingMenuItemAction(formData: FormData) {
  const { citySlug, businessSlug, routePath } = readRouteContext(formData);
  const itemId = readField(formData, "itemId");
  const session = await getWebSession();

  if (!session) {
    redirect("/admin/login");
  }

  const body = {
    categorySlug: readField(formData, "categorySlug") || undefined,
    name: readField(formData, "name"),
    slug: readField(formData, "slug") || undefined,
    description: readField(formData, "description") || undefined,
    price: Number(readField(formData, "price") || 0),
    compareAtPrice: readField(formData, "compareAtPrice")
      ? Number(readField(formData, "compareAtPrice"))
      : undefined,
    available: formData.get("available") === "on",
    featured: formData.get("featured") === "on",
    emoji: readField(formData, "emoji") || undefined,
    imageUrl: readField(formData, "imageUrl") || undefined,
    unit: readField(formData, "unit") || undefined,
    tags: readListField(formData, "tags"),
    allergens: readListField(formData, "allergens"),
    sortOrder: Number(readField(formData, "sortOrder") || 0),
  };

  try {
    if (itemId) {
      await fetchV2Api<AdminOrderingMenuItemResponse>(
        `/api/v2/ordering/businesses/${citySlug}/${businessSlug}/items/${itemId}`,
        {
          method: "PATCH",
          token: session.token,
          body,
        },
      );
    } else {
      await fetchV2Api<AdminOrderingMenuItemResponse>(
        `/api/v2/ordering/businesses/${citySlug}/${businessSlug}/items`,
        {
          method: "POST",
          token: session.token,
          body,
        },
      );
    }
  } catch (error) {
    const message = encodeURIComponent(mapApiError(error));
    redirect(`${routePath}?menuError=${message}#menu-manager`);
  }

  redirect(`${routePath}?menuSuccess=item#menu-manager`);
}

export async function toggleOrderingMenuItemAvailabilityAction(formData: FormData) {
  const { citySlug, businessSlug, routePath } = readRouteContext(formData);
  const itemId = readField(formData, "itemId");
  const session = await getWebSession();

  if (!session) {
    redirect("/admin/login");
  }

  try {
    await fetchV2Api<AdminOrderingMenuItemResponse>(
      `/api/v2/ordering/businesses/${citySlug}/${businessSlug}/items/${itemId}/availability`,
      {
        method: "PATCH",
        token: session.token,
      },
    );
  } catch (error) {
    const message = encodeURIComponent(mapApiError(error));
    redirect(`${routePath}?menuError=${message}#menu-manager`);
  }

  redirect(`${routePath}?menuSuccess=toggle#menu-manager`);
}

export async function deleteOrderingMenuItemAction(formData: FormData) {
  const { citySlug, businessSlug, routePath } = readRouteContext(formData);
  const itemId = readField(formData, "itemId");
  const session = await getWebSession();

  if (!session) {
    redirect("/admin/login");
  }

  try {
    await fetchV2Api(`/api/v2/ordering/businesses/${citySlug}/${businessSlug}/items/${itemId}`, {
      method: "DELETE",
      token: session.token,
    });
  } catch (error) {
    const message = encodeURIComponent(mapApiError(error));
    redirect(`${routePath}?menuError=${message}#menu-manager`);
  }

  redirect(`${routePath}?menuSuccess=delete#menu-manager`);
}

export async function toggleOrderingCouponAction(formData: FormData) {
  const { citySlug, businessSlug, routePath } = readRouteContext(formData);
  const couponId = readField(formData, "couponId");
  const active = readField(formData, "active") === "true";
  const session = await getWebSession();

  if (!session) {
    redirect("/admin/login");
  }

  try {
    await fetchV2Api(
      `/api/v2/ordering/businesses/${citySlug}/${businessSlug}/coupons/${couponId}`,
      {
        method: "PATCH",
        token: session.token,
        body: {
          active: !active,
        },
      },
    );
  } catch (error) {
    const message = encodeURIComponent(mapApiError(error));
    redirect(`${routePath}?couponError=${message}`);
  }

  redirect(`${routePath}?couponSuccess=1`);
}

export async function deleteOrderingCouponAction(formData: FormData) {
  const { citySlug, businessSlug, routePath } = readRouteContext(formData);
  const couponId = readField(formData, "couponId");
  const session = await getWebSession();

  if (!session) {
    redirect("/admin/login");
  }

  try {
    await fetchV2Api(
      `/api/v2/ordering/businesses/${citySlug}/${businessSlug}/coupons/${couponId}`,
      {
        method: "DELETE",
        token: session.token,
      },
    );
  } catch (error) {
    const message = encodeURIComponent(mapApiError(error));
    redirect(`${routePath}?couponError=${message}`);
  }

  redirect(`${routePath}?couponSuccess=1`);
}
