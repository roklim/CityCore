import type { PlatformBusiness } from "./platform-api";

export function isBusinessPublic(business: Pick<PlatformBusiness, "status" | "city">) {
  return business.status === "active" && business.city.status === "active" && business.city.active;
}
