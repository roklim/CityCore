const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? "http://localhost:3000/api"
    : "https://mucho-gusto-mg5y.onrender.com/api");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || "Richiesta fallita");
    error.status = response.status;
    throw error;
  }

  return data;
}

export function getMenu() {
  return request("/menu");
}

export function getAdminMenu(token) {
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
  return request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
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
