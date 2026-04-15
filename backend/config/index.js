"use strict";

const fs = require("node:fs");
const path = require("node:path");

const envPath = path.join(__dirname, "..", ".env");

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

// ── Helpers ────────────────────────────────────────────────
const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`[config] Variabile d'ambiente mancante: ${key}`);
  return val;
};

const optional = (key, fallback) => process.env[key] || fallback;

// ── Config ─────────────────────────────────────────────────
const nodeEnv = optional("NODE_ENV", "development");
const normalizedNodeEnv = nodeEnv === "prod" ? "production" : nodeEnv;

const config = {
  nodeEnv: normalizedNodeEnv,
  isProd: normalizedNodeEnv === "production",
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

  pickup: {
    slotMinutes: Number(optional("PICKUP_SLOT_MINUTES", "15")),
    maxOrdersPerSlot: Number(optional("PICKUP_MAX_ORDERS_PER_SLOT", "4")),
    startTime: optional("PICKUP_START_TIME", "18:00"),
    endTime: optional("PICKUP_END_TIME", "22:30"),
  },
};

module.exports = config;
