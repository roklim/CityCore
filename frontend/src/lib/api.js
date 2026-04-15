const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://mucho-gusto-mg5y.onrender.com/api";

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

export function getAvailability(date) {
  return request(`/orders/availability?date=${encodeURIComponent(date)}`);
}

export function lookupCustomer(phone) {
  return request(`/customers/lookup?phone=${encodeURIComponent(phone)}`);
}

export function createOrder(order) {
  return request("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
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
