"use strict";

const fs = require("node:fs");
const path = require("node:path");

const envPath = path.join(__dirname, "..", ".env");

// Loader .env minimale senza dotenv: mantiene il backend leggero e funziona
// anche quando le variabili sono gia' fornite dal provider cloud.
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

// required fallisce all'avvio per variabili critiche; optional permette default
// comodi per sviluppo locale.
const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`[config] Variabile d'ambiente mancante: ${key}`);
  return val;
};

const optional = (key, fallback) => process.env[key] || fallback;

const nodeEnv = optional("NODE_ENV", "development");
const normalizedNodeEnv = nodeEnv === "prod" ? "production" : nodeEnv;

// Unico oggetto config condiviso da server, route e script. Aggiungere nuove
// variabili qui evita letture sparse di process.env nel resto del codice.
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

  // Admin legacy di piattaforma: resta utile per bootstrap, recupero e gestione
  // dei business anche prima di avere global_admin salvati su Mongo.
  admin: {
    username: optional("ADMIN_USERNAME", "admin"),
    password: optional("ADMIN_PASSWORD", "admin123"),
  },

  business: {
    defaultSlug: optional("DEFAULT_BUSINESS_SLUG", "mucho-gusto"),
  },

  cors: {
    origin: optional("CORS_ORIGIN", "*"),
  },

  rateLimit: {
    windowMs: Number(optional("RATE_LIMIT_WINDOW_MS", String(15 * 60 * 1000))),
    max: Number(optional("RATE_LIMIT_MAX", "200")),
  },

  // Config condivisa per slot ritiro/asporto. In futuro puo' diventare
  // per-business leggendo StoreSettings, ma per ora conserva compatibilita.
  pickup: {
    slotMinutes: Number(optional("PICKUP_SLOT_MINUTES", "15")),
    maxOrdersPerSlot: Number(optional("PICKUP_MAX_ORDERS_PER_SLOT", "4")),
    startTime: optional("PICKUP_START_TIME", "18:00"),
    endTime: optional("PICKUP_END_TIME", "22:30"),
    timeZone: optional("PICKUP_TIME_ZONE", "Europe/Rome"),
    minPreparationMinutes: Number(optional("PICKUP_MIN_PREPARATION_MINUTES", "30")),
    closedWeekdays: optional("PICKUP_CLOSED_WEEKDAYS", "1")
      .split(",")
      .map((day) => Number(day.trim()))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
  },
};

module.exports = config;
