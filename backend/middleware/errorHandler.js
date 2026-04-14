"use strict";

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  // Log dettagliato solo in sviluppo
  if (process.env.NODE_ENV !== "production") {
    console.error("❌ ERROR:", err);
  } else {
    console.error(`❌ [${status}] ${req.method} ${req.url} — ${err.message}`);
  }

  res.status(status).json({
    error: status < 500 ? err.message : "Errore interno del server",
  });
}

module.exports = { errorHandler };
