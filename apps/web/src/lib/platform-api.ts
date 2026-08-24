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

type PlatformCity = {
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
  activeCategoryCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PlatformTemplate = {
  code: string;
  name: string;
  category: string;
  primaryModule: string;
  defaultCtaLabel: string;
  summary: string;
  persisted: boolean;
  templateId: string | null;
  active: boolean;
  updatedAt: string | null;
};

type PlatformCityRegistryEntry = {
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
  locality: string | null;
  province: string | null;
  socialLinks: Record<string, string> | null;
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
    active: boolean;
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

type PlatformAccessGrant = {
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

type PlatformAuditLog = {
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

type PlatformPaginatedResponse = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PlatformTemplatesResponse = {
  status: "ok";
  items: PlatformTemplate[];
};

export type PlatformCitiesResponse = PlatformPaginatedResponse & {
  status: "ok";
  items: PlatformCity[];
};

export type PlatformCityResponse = {
  status: "ok";
  item: PlatformCity;
};

export type PlatformCityRegistryResponse = PlatformPaginatedResponse & {
  status: "ok";
  items: PlatformCityRegistryEntry[];
};

export type PlatformBusinessesResponse = PlatformPaginatedResponse & {
  status: "ok";
  items: PlatformBusiness[];
};

export type PlatformBusinessResponse = {
  status: "ok";
  item: PlatformBusiness;
};

export type PlatformBusinessService = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  priceLabel: string | null;
  priceCents: number | null;
  durationMinutes: number | null;
  pickupEnabled: boolean;
  status: "draft" | "in_review" | "published" | "archived";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PlatformBusinessServicesResponse = {
  status: "ok";
  items: PlatformBusinessService[];
};

export type PlatformCityCategory = {
  id: string;
  cityId: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type PlatformCityCategoryTree = PlatformCityCategory & {
  children: PlatformCityCategoryTree[];
};

export type PlatformCityCategoriesResponse = {
  status: "ok";
  items: PlatformCityCategory[];
  tree: PlatformCityCategoryTree[];
};

export type PlatformBusinessCategoryAssignment = PlatformCityCategory & {
  primary: boolean;
  assignmentId: string;
};

export type PlatformBusinessCategoriesResponse = {
  status: "ok";
  items: PlatformBusinessCategoryAssignment[];
  availableCategories: PlatformCityCategory[];
};

type PlatformOpeningInterval = {
  id: string;
  opensAt: string;
  closesAt: string;
  sortOrder: number;
};

export type PlatformOpeningDay = {
  id: string;
  weekday: number;
  isClosed: boolean;
  note: string | null;
  intervals: PlatformOpeningInterval[];
};

export type PlatformOpeningHoursResponse = {
  status: "ok";
  items: PlatformOpeningDay[];
};

export type PlatformPublishReadiness = {
  canPublish: boolean;
  missingRequirements: string[];
  warnings: string[];
};

export type PlatformPublishReadinessResponse = {
  status: "ok";
  item: PlatformPublishReadiness;
};

export type PlatformBusinessInquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  privacyAccepted: boolean;
  status: "new" | "read" | "closed";
  readAt: string | null;
  internalNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlatformBusinessInquiriesResponse = {
  status: "ok";
  items: PlatformBusinessInquiry[];
  page: number;
  limit: number;
  total: number;
};

export type PlatformAccessGrantsResponse = PlatformPaginatedResponse & {
  status: "ok";
  items: PlatformAccessGrant[];
};

export type PlatformAuditLogsResponse = PlatformPaginatedResponse & {
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
  locality: string | null;
  province: string | null;
  socialLinks: Record<string, string> | null;
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
  categories: PublicBusinessCategory[];
  serviceNames: string[];
  serviceSearchTerms: string[];
  createdAt: string;
  updatedAt: string;
};

export type PublicBusinessCategory = {
  id: string;
  name: string;
  slug: string;
};

export type PublicCityResponse = {
  status: "ok";
  item: PublicPlatformCity;
};

export type PublicCityEvent = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string | null;
  status: "published";
  venueName: string;
  addressLine1: string | null;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  organizer: { name: string; businessSlug: string | null };
};

export type PublicCityEventsResponse = {
  status: "ok";
  items: PublicCityEvent[];
  page: number;
  limit: number;
  total: number;
};

export type PublicBusinessResponse = {
  status: "ok";
  item: PublicPlatformBusiness;
};

type PublicBusinessService = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  priceLabel: string | null;
  priceCents: number | null;
  durationMinutes: number | null;
  sortOrder: number;
};

export type PublicBusinessServicesResponse = {
  status: "ok";
  items: PublicBusinessService[];
};

type PublicOpeningInterval = { opensAt: string; closesAt: string; sortOrder: number };
export type PublicOpeningDay = {
  weekday: number;
  isClosed: boolean;
  note: string | null;
  intervals: PublicOpeningInterval[];
};
export type PublicOpeningHoursResponse = {
  status: "ok";
  timezone: string;
  items: PublicOpeningDay[];
};

export type PublicInquiryPayload = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  privacyAccepted: true;
  company?: string;
};

export type PublicInquiryResponse = { status: "ok" };

export type PublicPickupMenuItem = {
  id: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  priceCents: number;
};

export type PublicPickupOrderMenuResponse = {
  status: "ok";
  currency: string;
  timezone: string;
  minimumOrderCents: number;
  items: PublicPickupMenuItem[];
};

export type PublicPickupAvailabilityResponse = {
  status: "ok";
  date: string;
  timezone: string;
  items: Array<{ id: string; time: string; available: boolean }>;
};

export type PublicPickupOrderPayload = {
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  pickupDate: string;
  pickupTime: string;
  privacyAccepted: true;
  company?: string;
  items: Array<{ serviceId: string; quantity: number }>;
};

export type PublicPickupOrderResponse = {
  status: "ok";
  item: { reference: string; pickupAt: string; totalCents: number; currency: string };
};

type PlatformPickupOrder = {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  notes: string | null;
  pickupAt: string;
  status: "new" | "accepted" | "preparing" | "ready" | "completed" | "cancelled";
  totalCents: number;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    nameSnapshot: string;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
  }>;
};

export type PlatformPickupOrderingResponse = {
  status: "ok";
  item: {
    enabled: boolean;
    pickupLeadMinutes: number;
    slotMinutes: number;
    slotCapacity: number;
    minimumOrderCents: number;
  } | null;
};

export type PlatformPickupOrdersResponse = {
  status: "ok";
  items: PlatformPickupOrder[];
  page: number;
  limit: number;
  total: number;
};

export function createPublicBusinessInquiry(
  citySlug: string,
  businessSlug: string,
  payload: PublicInquiryPayload,
) {
  return fetchPlatformApi<PublicInquiryResponse>(
    `/api/v2/public/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/inquiries`,
    { method: "POST", body: payload },
  );
}

export function getPublicPickupAvailability(citySlug: string, businessSlug: string, date: string) {
  return fetchPlatformApi<PublicPickupAvailabilityResponse>(
    `/api/v2/public/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/orders/availability?date=${encodeURIComponent(date)}`,
  );
}

export function createPublicPickupOrder(
  citySlug: string,
  businessSlug: string,
  payload: PublicPickupOrderPayload,
) {
  return fetchPlatformApi<PublicPickupOrderResponse>(
    `/api/v2/public/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/orders`,
    { method: "POST", body: payload },
  );
}

type FetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  token?: string;
  body?: Record<string, unknown>;
  cache?: RequestCache;
  timeoutMs?: number;
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
  { method = "GET", token, body, cache = "no-store", timeoutMs = 20_000 }: FetchOptions = {},
) {
  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      cache,
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) {
      throw new Error(`Platform API request timed out after ${timeoutMs}ms.`, { cause: error });
    }

    throw error;
  }

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
