"use strict";

// ── Helpers ────────────────────────────────────────────────
const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`[config] Variabile d'ambiente mancante: ${key}`);
  return val;
};

const optional = (key, fallback) => process.env[key] || fallback;

// ── Config ─────────────────────────────────────────────────
const config = {
  nodeEnv: optional("NODE_ENV", "development"),
  isProd: optional("NODE_ENV", "development") === "production",
  port: Number(optional("PORT", "3000")),

  mongo: {
    uri: required("MONGODB_URI"),
  },

  jwt: {
    secret: required("JWT_SECRET"),
    expiresIn: optional("JWT_EXPIRES_IN", "8h"),
  },

  admin: {
    username: optional("ADMIN_USERNAME", "admin"),
    password: optional("ADMIN_PASSWORD", "admin123"),
  },

  cors: {
    origin: optional("CORS_ORIGIN", "*"),
  },

  rateLimit: {
    windowMs: Number(optional("RATE_LIMIT_WINDOW_MS", String(15 * 60 * 1000))),
    max: Number(optional("RATE_LIMIT_MAX", "200")),
  },
};

module.exports = config;
