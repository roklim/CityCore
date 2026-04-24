"use strict";

const config = require("../config");

const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${config.port}`;

// Fetch helper minimale per smoke test: fallisce con messaggio leggibile se una
// route critica non risponde come previsto.
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} -> ${response.status}: ${data.error || "errore"}`);
  }
  return data;
}

async function main() {
  // Testa solo il percorso essenziale: server vivo, login global admin, sessione
  // auth, risoluzione business e dashboard piattaforma.
  console.log(`[smoke] API: ${API_BASE_URL}`);
  await request("/health");
  console.log("[smoke] health ok");

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: config.admin.username,
      password: config.admin.password,
    }),
  });
  console.log("[smoke] login global admin ok");

  await request("/api/auth/me", {
    headers: { Authorization: `Bearer ${login.token}` },
  });
  console.log("[smoke] auth/me ok");

  await request("/api/business/current", {
    headers: { "X-Business-Slug": config.business.defaultSlug },
  });
  console.log("[smoke] business/current ok");

  await request("/api/business/cities/search?q=cagli");
  console.log("[smoke] public city search ok");

  await request("/api/business/public?city=cagli");
  console.log("[smoke] public city businesses ok");

  await request("/api/platform/businesses", {
    headers: { Authorization: `Bearer ${login.token}` },
  });
  console.log("[smoke] platform/businesses ok");

  await request("/api/platform/cities", {
    headers: { Authorization: `Bearer ${login.token}` },
  });
  console.log("[smoke] platform/cities ok");

  await request("/api/platform/registry/cities?q=cagli", {
    headers: { Authorization: `Bearer ${login.token}` },
  });
  console.log("[smoke] platform city registry ok");
}

main().catch((error) => {
  console.error("[smoke] Errore:", error.message);
  process.exitCode = 1;
});
