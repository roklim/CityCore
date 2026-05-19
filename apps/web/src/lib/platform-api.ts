export class PlatformApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "PlatformApiError";
    this.status = status;
    this.details = details;
  }
}

export type AuthAccess = {
  id: string;
  role: "global_admin" | "city_admin" | "local_admin" | "staff";
  scopeType: "platform" | "city" | "business";
  cityId: string | null;
  businessId: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  permissions: readonly string[];
  city: {
    id: string;
    name: string;
    slug: string;
    status: "active" | "coming_soon" | "disabled";
  } | null;
  business: {
    id: string;
    name: string;
    slug: string;
    status: "draft" | "active" | "paused" | "disabled";
    city: {
      id: string;
      name: string;
      slug: string;
      status: "active" | "coming_soon" | "disabled";
    };
  } | null;
};

export type AuthSessionResponse = {
  status: "ok";
  expiresIn: number;
  token?: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    status: "invited" | "active" | "disabled";
    lastLoginAt: string | null;
    authVersion: number;
    createdAt: string;
    updatedAt: string;
  };
  accesses: AuthAccess[];
  defaultAccess: AuthAccess;
  activeAccess: AuthAccess;
  redirectTo: string;
};

export type PlatformCity = {
  id: string;
  name: string;
  slug: string;
  province: string | null;
  region: string | null;
  country: string;
  status: "active" | "coming_soon" | "disabled";
  active: boolean;
  sortOrder: number;
  heroTitle: string | null;
  heroDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  businessCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PlatformCityRegistryEntry = {
  id: string;
  name: string;
  slug: string;
  provinceCode: string | null;
  provinceName: string | null;
  regionCode: string | null;
  regionName: string | null;
  country: string;
  istatCode: string | null;
  cadastralCode: string | null;
  source: string | null;
  sourceVersion: string | null;
  lat: number | null;
  lng: number | null;
  activeMunicipality: boolean;
  searchText: string | null;
  linkedCity: {
    id: string;
    name: string;
    slug: string;
    status: "active" | "coming_soon" | "disabled";
    active: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type PlatformBusiness = {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  category: string | null;
  status: "draft" | "active" | "paused" | "disabled";
  plan: "free" | "pro" | "premium" | "enterprise";
  subscriptionStatus: "trialing" | "active" | "past_due" | "cancelled";
  publicEmail: string | null;
  publicPhone: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  timezone: string;
  currency: string;
  locale: string;
  primaryColor: string | null;
  accentColor: string | null;
  publicTitle: string | null;
  publicSubtitle: string | null;
  publicDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  bookingPolicy: string | null;
  cancellationPolicy: string | null;
  notesInternal: string | null;
  city: {
    id: string;
    name: string;
    slug: string;
    status: "active" | "coming_soon" | "disabled";
  };
  template: {
    id: string;
    code: string;
    name: string;
    category: string;
    primaryModule: string;
    defaultCtaLabel: string | null;
  };
  modules: Array<{
    moduleCode: string;
    active: boolean;
  }>;
  owner: {
    id: string;
    email: string;
    name: string | null;
    status: "invited" | "active" | "disabled";
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type PlatformAccessGrant = {
  id: string;
  role: "global_admin" | "city_admin" | "local_admin" | "staff";
  scopeType: "platform" | "city" | "business";
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    status: "invited" | "active" | "disabled";
    lastLoginAt: string | null;
  };
  city: {
    id: string;
    name: string;
    slug: string;
    status: "active" | "coming_soon" | "disabled";
  } | null;
  business: {
    id: string;
    name: string;
    slug: string;
    status: "draft" | "active" | "paused" | "disabled";
    city: {
      id: string;
      name: string;
      slug: string;
      status: "active" | "coming_soon" | "disabled";
    };
  } | null;
};

export type PlatformAuditLog = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  scopeType: "platform" | "city" | "business";
  metadataJson: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actorUser: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  city: {
    id: string;
    name: string;
    slug: string;
    status: "active" | "coming_soon" | "disabled";
  } | null;
  business: {
    id: string;
    name: string;
    slug: string;
    status: "draft" | "active" | "paused" | "disabled";
    city: {
      id: string;
      name: string;
      slug: string;
      status: "active" | "coming_soon" | "disabled";
    };
  } | null;
};

export type PlatformCitiesResponse = {
  status: "ok";
  items: PlatformCity[];
};

export type PlatformCityRegistryResponse = {
  status: "ok";
  items: PlatformCityRegistryEntry[];
};

export type PlatformBusinessesResponse = {
  status: "ok";
  items: PlatformBusiness[];
};

export type PlatformAccessGrantsResponse = {
  status: "ok";
  items: PlatformAccessGrant[];
};

export type PlatformAuditLogsResponse = {
  status: "ok";
  items: PlatformAuditLog[];
};

export type PublicPlatformCity = {
  id: string;
  name: string;
  slug: string;
  province: string | null;
  region: string | null;
  country: string;
  status: "active" | "coming_soon" | "disabled";
  heroTitle: string | null;
  heroDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  businessCount: number;
};

export type PublicPlatformBusiness = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  status: "draft" | "active" | "paused" | "disabled";
  publicEmail: string | null;
  publicPhone: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  timezone: string;
  currency: string;
  locale: string;
  primaryColor: string | null;
  accentColor: string | null;
  publicTitle: string | null;
  publicSubtitle: string | null;
  publicDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  bookingPolicy: string | null;
  cancellationPolicy: string | null;
  city: {
    id: string;
    name: string;
    slug: string;
    status: "active" | "coming_soon" | "disabled";
  };
  template: {
    id: string;
    code: string;
    name: string;
    category: string;
    primaryModule: string;
    defaultCtaLabel: string | null;
  };
  modules: Array<{
    moduleCode: string;
    active: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type PublicCitiesResponse = {
  status: "ok";
  items: PublicPlatformCity[];
};

export type PublicCityResponse = {
  status: "ok";
  item: PublicPlatformCity;
};

export type PublicBusinessesResponse = {
  status: "ok";
  items: PublicPlatformBusiness[];
};

export type PublicBusinessResponse = {
  status: "ok";
  item: PublicPlatformBusiness;
};

type FetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  token?: string;
  body?: Record<string, unknown>;
  cache?: RequestCache;
};

function getApiBaseUrl() {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!value) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is required for the CityCore web app.");
  }

  return value.replace(/\/+$/, "");
}

export async function fetchPlatformApi<TResponse>(
  path: string,
  { method = "GET", token, body, cache = "no-store" }: FetchOptions = {},
) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    cache,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const responseBody = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof responseBody === "object" &&
      responseBody &&
      "error" in responseBody &&
      typeof responseBody.error === "string"
        ? responseBody.error
        : `Platform API request failed with status ${response.status}`;

    throw new PlatformApiError(message, response.status, responseBody);
  }

  return responseBody as TResponse;
}
