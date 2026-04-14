const API = "https://mucho-gusto-mg5y.onrender.com/api";

export async function getMenu() {
  const res = await fetch(`${API}/menu`);
  if (!res.ok) throw new Error("Errore nel caricamento del menu");
  return res.json();
}

export async function createOrder(data) {
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Errore nell'invio dell'ordine");
  return res.json();
}

export async function loginAdmin(username, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Credenziali non valide");
  return data;
}

export async function getOrders(token) {
  const res = await fetch(`${API}/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("401");
  const data = await res.json();
  return data.orders || [];
}

export async function updateOrderStatus(id, status, token) {
  const res = await fetch(`${API}/orders/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Errore nell'aggiornamento");
  return res.json();
}
