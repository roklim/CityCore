const API = "https://mucho-gusto-mg5y.onrender.com/api";

export async function getMenu() {
  return fetch(`${API}/menu`).then((r) => r.json());
}

export async function createOrder(data) {
  return fetch(`${API}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
