export class V2ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "V2ApiError";
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

export type PublicOrderingMenuItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  compareAtPrice: number | null;
  available: boolean;
  featured: boolean;
  emoji: string | null;
  imageUrl: string | null;
  unit: string | null;
  tags: string[];
  allergens: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicOrderingMenuCategory = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  items: PublicOrderingMenuItem[];
};

export type PublicOrderingMenuResponse = {
  status: "ok";
  business: {
    id: string;
    name: string;
    slug: string;
    publicTitle: string | null;
    publicSubtitle: string | null;
    publicDescription: string | null;
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
      primaryModule: string;
      defaultCtaLabel: string | null;
    };
  };
  settings: {
    openingHours: string | null;
    openingDays: string[];
    openingTimeStart: string | null;
    openingTimeEnd: string | null;
    deliveryCost: number;
    minimumOrder: number;
    slotMinutes: number;
    maxOrdersPerSlot: number;
    minPreparationMinutes: number;
    closedDates: string[];
    specialDates: OrderingSpecialDate[];
    serviceZones: string[];
    customerMessage: string | null;
  };
  categories: PublicOrderingMenuCategory[];
};

export type OrderingSpecialDate = {
  date: string;
  closed: boolean;
  openingTimeStart: string | null;
  openingTimeEnd: string | null;
  slotMinutes: number | null;
  maxOrdersPerSlot: number | null;
  minPreparationMinutes: number | null;
};

export type PublicOrderingAvailabilitySlot = {
  time: string;
  pickupSlot: string;
  pickupAt: string;
  count: number;
  remaining: number;
  full: boolean;
  almostFull: boolean;
  past: boolean;
  available: boolean;
};

export type PublicOrderingAvailabilityResponse = {
  status: "ok";
  date: string;
  closed: boolean;
  slotMinutes: number;
  maxOrdersPerSlot: number;
  minPreparationMinutes: number;
  startTime: string;
  endTime: string;
  slots: PublicOrderingAvailabilitySlot[];
};

export type PublicOrderingOrderItem = {
  id: string;
  menuItemId: string | null;
  name: string;
  price: number;
  qty: number;
  notes: string | null;
  lineTotal: number;
};

export type PublicOrderingOrder = {
  id: string;
  couponCode: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  status: "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";
  fulfillmentType: "pickup" | "delivery";
  pickupAt: string | null;
  notes: string | null;
  subtotal: number;
  discountTotal: number;
  serviceFee: number;
  deliveryFee: number;
  grandTotal: number;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  source: "web" | "admin" | "phone";
  createdAt: string;
  updatedAt: string;
  items: PublicOrderingOrderItem[];
};

export type PublicOrderingCreateOrderResponse = {
  status: "ok";
  order: PublicOrderingOrder;
  trackingPath: string;
};

export type PublicOrderingOrderResponse = {
  status: "ok";
  order: PublicOrderingOrder;
};

export type OrderingCustomerProfile = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  points: number;
  totalOrders: number;
  completedOrders: number;
  lastOrderAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicOrderingCustomerLookupResponse = {
  status: "ok";
  found: boolean;
  customer?: OrderingCustomerProfile;
  lastOrder?: PublicOrderingOrder | null;
};

export type AdminOrderingCustomer = OrderingCustomerProfile & {
  totalSpent: number;
};

export type AdminOrderingCustomersResponse = {
  status: "ok";
  items: AdminOrderingCustomer[];
};

export type OrderingCoupon = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number | null;
  expiresAt: string | null;
  usageLimit: number;
  usedCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminOrderingCouponsResponse = {
  status: "ok";
  items: OrderingCoupon[];
};

export type AdminOrderingCouponResponse = {
  status: "ok";
  item: OrderingCoupon;
};

export type OrderingSettings = {
  openingHours: string | null;
  openingDays: string[];
  openingTimeStart: string | null;
  openingTimeEnd: string | null;
  deliveryCost: number;
  minimumOrder: number;
  slotMinutes: number;
  maxOrdersPerSlot: number;
  minPreparationMinutes: number;
  closedDates: string[];
  specialDates: OrderingSpecialDate[];
  serviceZones: string[];
  customerMessage: string | null;
};

export type AdminOrderingSettingsResponse = {
  status: "ok";
  settings: OrderingSettings;
};

export type AdminOrderingOrdersResponse = {
  status: "ok";
  items: PublicOrderingOrder[];
};

export type AdminOrderingMenuResponse = {
  status: "ok";
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
      active: boolean;
    };
    orderingEnabled: boolean;
  };
  categories: PublicOrderingMenuCategory[];
};

export type AdminOrderingMenuItemResponse = {
  status: "ok";
  item: PublicOrderingMenuItem;
};

export type AdminOrderingStatsResponse = {
  status: "ok";
  summary: {
    total: number;
    open: number;
    pending: number;
    confirmed: number;
    preparing: number;
    ready: number;
    completed: number;
    cancelled: number;
    revenue: number;
  };
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
    throw new Error("NEXT_PUBLIC_API_BASE_URL is required for the V2 web app.");
  }

  return value.replace(/\/+$/, "");
}

export async function fetchV2Api<TResponse>(
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
        : `V2 API request failed with status ${response.status}`;

    throw new V2ApiError(message, response.status, responseBody);
  }

  return responseBody as TResponse;
}
