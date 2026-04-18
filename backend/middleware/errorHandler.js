"use strict";

// Middleware finale Express per errori applicativi e imprevisti.
// Tiene le risposte client semplici e centralizza i log server.
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  // In sviluppo vogliamo lo stack completo; in produzione basta una riga
  // compatta per log provider tipo Render senza esporre dettagli al client.
  if (process.env.NODE_ENV !== "production") {
    console.error("[error]", err);
  } else {
    console.error(`[error] [${status}] ${req.method} ${req.url} - ${err.message}`);
  }

  // Gli errori 5xx rispondono con messaggio generico per non rivelare dettagli
  // interni del server o del database.
  res.status(status).json({
    error: status < 500 ? err.message : "Errore interno del server",
  });
}

module.exports = { errorHandler };
