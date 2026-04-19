"use strict";

const config = require("./index");

function getAllowedOrigins() {
  if (config.cors.origin === "*") return "*";

  return Array.from(
    new Set([
      config.cors.origin,
      ...config.cors.origins,
    ].filter(Boolean)),
  );
}

function isVercelAppOrigin(origin) {
  // Preview + production domains su Vercel terminano in .vercel.app
  // (es. https://my-app.vercel.app oppure https://my-app-<hash>.vercel.app).
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && url.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileOriginPatterns(origins) {
  const exact = new Set();
  const wildcardRegexes = [];

  for (const origin of origins) {
    const value = String(origin).trim().replace(/\/+$/, "");
    if (!value) continue;

    if (value.includes("*")) {
      // Supportiamo wildcard semplici (es. https://*.vercel.app) per i deploy Vercel.
      const pattern = "^" + value.split("*").map(escapeRegex).join(".*") + "$";
      wildcardRegexes.push(new RegExp(pattern));
      continue;
    }

    exact.add(value);
  }

  return { exact, wildcardRegexes };
}

function createCorsOptions() {
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins === "*") {
    return { origin: true };
  }

  const { exact, wildcardRegexes } = compileOriginPatterns(allowedOrigins);
  const allowVercelWildcard = String(process.env.CORS_ALLOW_VERCEL_APP || "")
    .trim()
    .toLowerCase() === "true";

  return {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (exact.has(origin)) {
        return callback(null, true);
      }

      if (wildcardRegexes.some((regex) => regex.test(origin))) {
        return callback(null, true);
      }

      if (allowVercelWildcard && isVercelAppOrigin(origin)) {
        return callback(null, true);
      }

      // Non lanciamo un errore (evita 500 sul preflight). Senza header ACAO,
      // il browser blocca comunque la richiesta e noi vediamo un log chiaro.
      console.warn("[cors] Origin non autorizzato:", origin);
      return callback(null, false);
    },
  };
}

module.exports = { createCorsOptions, getAllowedOrigins };
