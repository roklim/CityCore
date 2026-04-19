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

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileOriginPatterns(origins) {
  const exact = new Set();
  const wildcardRegexes = [];

  for (const origin of origins) {
    const value = String(origin).trim();
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

      return callback(new Error(`CORS origin non autorizzato: ${origin}`));
    },
  };
}

module.exports = { createCorsOptions, getAllowedOrigins };
