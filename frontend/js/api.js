const runtimeApi = window.APP_CONFIG?.API_BASE_URL?.trim();

const metaApi = document
  .querySelector('meta[name="api-base-url"]')
  ?.content?.trim();

const configuredApi = runtimeApi || metaApi;

const normalizedConfiguredApi = configuredApi
  ? configuredApi.replace(/\/$/, "")
  : "";

const defaultApi =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : `${window.location.origin}/api`;

const API = normalizedConfiguredApi || defaultApi;
console.log("API BASE URL:", normalizedConfiguredApi);
async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Richiesta fallita");
  }

  return data;
}

export async function getMenu() {
  return request("/menu");
}

export async function createOrder(data) {
  return request("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function loginAdmin(username, password) {
  return request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export async function getOrders(token) {
  const response = await fetch(`${API}/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) throw new Error("401");

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Errore nel caricamento ordini");
  }

  return data.orders || [];
}

export async function updateOrderStatus(id, status, token) {
  return request(`/orders/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
}
