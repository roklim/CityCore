import type { getRequestAuth } from "../auth.js";

export function buildAccessibleCityFilter(auth: ReturnType<typeof getRequestAuth>) {
  if (auth.activeAccess.scopeType === "city" || auth.activeAccess.scopeType === "business") {
    return auth.activeAccess.cityId ? { id: auth.activeAccess.cityId } : { id: { in: [] } };
  }

  return {};
}

export function buildAccessibleBusinessFilter(auth: ReturnType<typeof getRequestAuth>) {
  if (auth.activeAccess.scopeType === "business") {
    return auth.activeAccess.businessId ? { id: auth.activeAccess.businessId } : { id: { in: [] } };
  }

  if (auth.activeAccess.scopeType === "city") {
    return auth.activeAccess.cityId ? { cityId: auth.activeAccess.cityId } : { id: { in: [] } };
  }

  return {};
}

export function buildAccessibleAccessGrantFilter(auth: ReturnType<typeof getRequestAuth>) {
  if (auth.activeAccess.scopeType === "business") {
    return auth.activeAccess.businessId
      ? { businessId: auth.activeAccess.businessId }
      : { id: { in: [] } };
  }

  if (auth.activeAccess.scopeType === "city") {
    return auth.activeAccess.cityId ? { cityId: auth.activeAccess.cityId } : { id: { in: [] } };
  }

  return {};
}

export function buildAccessibleAuditLogFilter(auth: ReturnType<typeof getRequestAuth>) {
  if (auth.activeAccess.scopeType === "business") {
    return auth.activeAccess.businessId
      ? { businessId: auth.activeAccess.businessId }
      : { id: { in: [] } };
  }

  if (auth.activeAccess.scopeType === "city") {
    return auth.activeAccess.cityId ? { cityId: auth.activeAccess.cityId } : { id: { in: [] } };
  }

  return {};
}
