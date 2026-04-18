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

function createCorsOptions() {
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins === "*") {
    return { origin: true };
  }

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS origin non autorizzato: ${origin}`));
    },
  };
}

module.exports = { createCorsOptions, getAllowedOrigins };
