"use strict";

const jwt = require("jsonwebtoken");
const config = require("../config");

// Estrae il payload JWT senza imporre un ruolo specifico. Viene riusato anche
// dal resolver business per capire se una richiesta e' tenant-locked.
function getTokenPayload(req) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  return jwt.verify(header.slice(7), config.jwt.secret);
}

// Autenticazione base: valida il bearer token e rende req.user disponibile alle
// route successive.
function requireAuth(req, res, next) {
  try {
    const payload = getTokenPayload(req);
    if (!payload) return res.status(401).json({ error: "Token mancante" });
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Token non valido o scaduto" });
  }
}

// Permette l'accesso a utenti operativi di business e al global_admin.
// Utile per route admin generiche che non richiedono un ruolo preciso.
function requireBusinessUser(req, res, next) {
  return requireAuth(req, res, () => {
    if (!["global_admin", "owner", "admin", "staff"].includes(req.user?.role)) {
      return res.status(403).json({ error: "Accesso business non autorizzato" });
    }

    next();
  });
}

// Controllo ruoli per singolo business. Il global_admin passa sempre, mentre
// owner/admin/staff devono essere presenti nella lista esplicita.
function requireBusinessRole(roles = []) {
  return (req, res, next) =>
    requireAuth(req, res, () => {
      if (req.user?.role === "global_admin" || roles.includes(req.user?.role)) {
        return next();
      }

      return res.status(403).json({ error: "Permessi insufficienti" });
    });
}

// Accesso esclusivo al pannello piattaforma: gestione tenant, owner e metriche
// cross-business non devono essere visibili agli owner dei singoli locali.
function requireGlobalAdmin(req, res, next) {
  return requireAuth(req, res, () => {
    if (req.user?.role !== "global_admin") {
      return res.status(403).json({ error: "Accesso globale non autorizzato" });
    }

    next();
  });
}

module.exports = {
  getTokenPayload,
  requireAuth,
  requireBusinessRole,
  requireBusinessUser,
  requireGlobalAdmin,
};
