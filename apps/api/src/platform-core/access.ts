import type { getRequestAuth } from "../auth.js";

export function buildAccessibleCityFilter(auth: ReturnType<typeof getRequestAuth>) {
  if (auth.activeAccess.scopeType === "city" && auth.activeAccess.cityId) {
    return {
      id: auth.activeAccess.cityId,
    };
  }

  if (auth.activeAccess.scopeType === "business" && auth.activeAccess.cityId) {
    return {
      id: auth.activeAccess.cityId,
    };
  }

  return {};
}

export function buildAccessibleBusinessFilter(auth: ReturnType<typeof getRequestAuth>) {
  if (auth.activeAccess.scopeType === "business" && auth.activeAccess.businessId) {
    return {
      id: auth.activeAccess.businessId,
    };
  }

  if (auth.activeAccess.scopeType === "city" && auth.activeAccess.cityId) {
    return {
      cityId: auth.activeAccess.cityId,
    };
  }

  return {};
}

export function buildAccessibleAccessGrantFilter(auth: ReturnType<typeof getRequestAuth>) {
  if (auth.activeAccess.scopeType === "business" && auth.activeAccess.businessId) {
    return {
      businessId: auth.activeAccess.businessId,
    };
  }

  if (auth.activeAccess.scopeType === "city" && auth.activeAccess.cityId) {
    return {
      cityId: auth.activeAccess.cityId,
    };
  }

  return {};
}

export function buildAccessibleAuditLogFilter(auth: ReturnType<typeof getRequestAuth>) {
  if (auth.activeAccess.scopeType === "business" && auth.activeAccess.businessId) {
    return {
      businessId: auth.activeAccess.businessId,
    };
  }

  if (auth.activeAccess.scopeType === "city" && auth.activeAccess.cityId) {
    return {
      cityId: auth.activeAccess.cityId,
    };
  }

  return {};
}
