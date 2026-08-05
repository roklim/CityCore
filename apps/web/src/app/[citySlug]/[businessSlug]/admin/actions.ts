"use server";

import { revalidatePath } from "next/cache";

import { fetchPlatformApi } from "../../../../lib/platform-api";
import { getWebSession } from "../../../../lib/web-session";

const orderStatuses = new Set(["new", "accepted", "preparing", "ready", "completed", "cancelled"]);

export async function updatePickupOrderStatusAction(formData: FormData) {
  const citySlug = formData.get("citySlug");
  const businessSlug = formData.get("businessSlug");
  const orderId = formData.get("orderId");
  const status = formData.get("status");
  if (
    typeof citySlug !== "string" ||
    typeof businessSlug !== "string" ||
    typeof orderId !== "string" ||
    typeof status !== "string" ||
    !orderStatuses.has(status)
  )
    return;
  const session = await getWebSession();
  if (!session) return;
  await fetchPlatformApi(
    `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/pickup-orders/${encodeURIComponent(orderId)}`,
    { method: "PATCH", token: session.token, body: { status } },
  );
  revalidatePath(`/${citySlug}/${businessSlug}/admin`);
}
