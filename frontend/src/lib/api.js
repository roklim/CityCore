function normalizeApiBaseUrl(raw) {
  // Su Vercel e' facile impostare per errore `VITE_API_BASE_URL` senza `/api`.
  // Normalizziamo qui cosi' tutte le chiamate restano consistenti.
  if (!raw) return "";
  const trimmed = String(raw).trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

const API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV
      ? "http://localhost:3000/api"
      : "https://mucho-gusto-mg5y.onrender.com/api"),
);

const DEFAULT_BUSINESS_SLUG = import.meta.env.VITE_BUSINESS_SLUG || "mucho-gusto";

// Sessione admin salvata dal frontend. La usiamo solo per UX/routing: il vero
// isolamento tenant resta nel backend tramite JWT con businessId.
function getStoredAdminSession() {
  try {
    return JSON.parse(localStorage.getItem("admin_session") || "{}");
  } catch {
    return {};
  }
}

export function getBusinessSlug() {
  const pathname = typeof window === "undefined" ? "" : window.location.pathname;
  const search = typeof window === "undefined" ? "" : window.location.search;
  const params = new URLSearchParams(search);
  const session = getStoredAdminSession();
  const adminMatch = pathname.match(/^\/admin\/([^/]+)/);
  const publicMatch = pathname.match(/^\/p\/([^/]+)/);
  const cityBusinessMatch = pathname.match(/^\/([^/]+)\/([^/]+)(?:\/admin|\/ordine\/|\/?$)/);
  const businessBaseMatch = pathname.match(/^\/([^/]+)(?:\/admin|\/ordine\/|\/?$)/);
  const reservedSlugs = new Set([
    "admin",
    "ordine",
    "p",
    "businesses",
    "cities",
    "users",
    "settings",
  ]);
  const adminSlug = reservedSlugs.has(adminMatch?.[1]) ? "" : adminMatch?.[1];
  const nestedSlug = reservedSlugs.has(cityBusinessMatch?.[2])
    ? ""
    : cityBusinessMatch?.[2];
  const baseSlug = reservedSlugs.has(businessBaseMatch?.[1])
    ? ""
    : businessBaseMatch?.[1];
  const match = (adminSlug && { 1: adminSlug }) || publicMatch;
  if (
    session.role === "global_admin" &&
    (pathname === "/" || pathname === "/admin" || pathname.startsWith("/admin/"))
  ) {
    return "";
  }
  if (
    (pathname.startsWith("/admin") || /\/admin(?:\/|$)/.test(pathname)) &&
    session.role &&
    session.role !== "global_admin" &&
    session.business?.slug
  ) {
    // Un owner/admin/staff non puo' cambiare tenant navigando manualmente:
    // anche il frontend continua a inviare lo slug del suo business.
    return session.business.slug;
  }
  if (params.get("business")) return params.get("business");
  return match?.[1] || nestedSlug || baseSlug || DEFAULT_BUSINESS_SLUG;
}

export function getCitySlug() {
  const pathname = typeof window === "undefined" ? "" : window.location.pathname;
  const search = typeof window === "undefined" ? "" : window.location.search;
  const params = new URLSearchParams(search);
  const parts = pathname.split("/").filter(Boolean);
  const reservedSlugs = new Set([
    "admin",
    "ordine",
    "p",
    "businesses",
    "cities",
    "users",
    "settings",
  ]);
  if (
    parts.length >= 2 &&
    !reservedSlugs.has(parts[0]) &&
    !reservedSlugs.has(parts[1])
  ) {
    return parts[0];
  }
  return params.get("city") || "";
}

async function request(path, options = {}) {
  // Wrapper unico per fetch: aggiunge sempre lo slug business e normalizza gli
  // errori backend in Error leggibili dal resto dell'app.
  const { tenant = true, headers = {}, ...fetchOptions } = options;
  const businessSlug = tenant ? getBusinessSlug() : "";
  const citySlug = tenant ? getCitySlug() : "";
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers: {
      ...(businessSlug ? { "X-Business-Slug": businessSlug } : {}),
      ...(citySlug ? { "X-City-Slug": citySlug } : {}),
      ...headers,
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const isMissingBackendRoute =
      response.status === 404 && data.error === "Endpoint non trovato";
    const message = isMissingBackendRoute
      ? `Endpoint backend non trovato (${path}). Riavvia il backend o verifica che stia girando il codice aggiornato.`
      : data.error || "Richiesta fallita";
    const error = new Error(message);
    error.status = response.status;
    error.path = path;
    throw error;
  }

  return data;
}

export async function getCurrentBusiness() {
  // Risolve branding/features del business corrente per pagina pubblica/admin.
  const data = await request("/business/current");
  return data.business;
}

export async function getPublicCities() {
  const data = await request("/business/cities", { tenant: false });
  return data.cities || [];
}

export async function getPublicCity(slug) {
  const data = await request(`/business/cities/${encodeURIComponent(slug)}`, {
    tenant: false,
  });
  return data.city;
}

export async function searchPublicCities(query = "") {
  const params = query ? `?q=${encodeURIComponent(query)}` : "";
  const data = await request(`/business/cities/search${params}`, {
    tenant: false,
  });
  return data.cities || [];
}

export async function getPublicBusinesses(citySlug = "") {
  const params = citySlug ? `?city=${encodeURIComponent(citySlug)}` : "";
  const data = await request(`/business/public${params}`, { tenant: false });
  return data.businesses || [];
}

export async function getMe(token) {
  // Reidrata la sessione admin dopo refresh pagina.
  return request("/auth/me", {
    tenant: false,
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getPlatformBusinesses(token) {
  // Solo global_admin: elenco e metriche cross-business.
  const data = await request("/platform/businesses", {
    tenant: false,
    headers: { Authorization: `Bearer ${token}` },
  });

  return data.businesses || [];
}

export async function getPlatformCities(token) {
  const data = await request("/platform/cities", {
    tenant: false,
    headers: { Authorization: `Bearer ${token}` },
  });

  return data.cities || [];
}

export async function searchPlatformRegistryCities(token, query = "") {
  const params = query ? `?q=${encodeURIComponent(query)}` : "";
  const data = await request(`/platform/registry/cities${params}`, {
    tenant: false,
    headers: { Authorization: `Bearer ${token}` },
  });

  return data.cities || [];
}

export async function activatePlatformCity(city, token) {
  const data = await request("/platform/cities/activate", {
    tenant: false,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(city),
  });

  return data.city;
}

export async function updatePlatformCityStatus(id, patch, token) {
  const data = await request(`/platform/cities/${id}/status`, {
    tenant: false,
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patch),
  });

  return data.city;
}

export function createPlatformBusiness(business, token) {
  // Crea tenant e, se fornito, anche owner Mongo con password temporanea.
  return request("/platform/businesses", {
    tenant: false,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(business),
  });
}

export function updatePlatformBusiness(id, business, token) {
  return request(`/platform/businesses/${id}`, {
    tenant: false,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(business),
  });
}

export async function getBusinessUsers(businessId, token) {
  // Solo global_admin: utenti owner/admin/staff del business selezionato.
  const data = await request(`/platform/businesses/${businessId}/users`, {
    tenant: false,
    headers: { Authorization: `Bearer ${token}` },
  });

  return data.users || [];
}

export function createBusinessUser(businessId, user, token) {
  return request(`/platform/businesses/${businessId}/users`, {
    tenant: false,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(user),
  });
}

export function updateBusinessUser(userId, user, token) {
  return request(`/platform/users/${userId}`, {
    tenant: false,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(user),
  });
}

export function getMenu() {
  // Menu pubblico: il backend restituisce solo prodotti disponibili.
  return request("/menu");
}

export function getAdminMenu(token) {
  // Menu admin: include prodotti nascosti/esauriti del tenant.
  return request("/menu/all", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createMenuItem(item, token) {
  return request("/menu", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(item),
  });
}

export function updateMenuItem(id, item, token) {
  return request(`/menu/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(item),
  });
}

export function toggleMenuItem(id, token) {
  return request(`/menu/${id}/toggle`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function deleteMenuItem(id, token) {
  return request(`/menu/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getOrderStats(token) {
  return request("/orders/stats", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getAvailability(date) {
  return request(`/orders/availability?date=${encodeURIComponent(date)}`);
}

export function lookupCustomer(phone) {
  return request(`/customers/lookup?phone=${encodeURIComponent(phone)}`);
}

export async function getAdminCustomers(token, query = "") {
  const params = query ? `?q=${encodeURIComponent(query)}` : "";
  const data = await request(`/customers${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return data.customers || [];
}

export async function getCoupons(token) {
  const data = await request("/coupons", {
    headers: { Authorization: `Bearer ${token}` },
  });

  return data.coupons || [];
}

export function createCoupon(coupon, token) {
  return request("/coupons", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(coupon),
  });
}

export function updateCoupon(id, coupon, token) {
  return request(`/coupons/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(coupon),
  });
}

export function toggleCoupon(id, token) {
  return request(`/coupons/${id}/toggle`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function deleteCoupon(id, token) {
  return request(`/coupons/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getStoreSettings(token) {
  return request("/settings", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateStoreSettings(settings, token) {
  return request("/settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(settings),
  });
}

export function createOrder(order) {
  // Creazione ordine pubblico. Il tenant viene risolto da slug/header.
  return request("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
}

export function getOrder(id) {
  return request(`/orders/${encodeURIComponent(id)}`);
}

export async function getCustomerOrders(phone) {
  const data = await request(
    `/orders/customer?phone=${encodeURIComponent(phone)}`,
  );

  return data.orders || [];
}

export function loginAdmin(username, password) {
  // businessSlug permette login owner/admin/staff sulla propria app dedicata.
  return request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email: username, password, businessSlug: getBusinessSlug() }),
  });
}

export async function getOrders(token, pickupDate) {
  const params = pickupDate
    ? `?pickupDate=${encodeURIComponent(pickupDate)}&limit=200`
    : "?limit=200";

  const data = await request(`/orders${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return data.orders || [];
}

export function updateOrderStatus(id, status, token) {
  return request(`/orders/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
}
