"use strict";

const { Business, DEFAULT_BUSINESS_SLUG, ensureDefaultBusiness } = require("../db");
const { getTokenPayload } = require("./auth");

// Normalizza nomi pubblici e query string in slug sicuri e stabili per URL,
// header X-Business-Slug e progetti Vercel dedicati.
function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Risolve il tenant della richiesta. Per richieste pubbliche usa slug/header;
// per utenti owner/admin/staff ignora gli hint esterni e usa il businessId JWT.
async function resolveBusiness(req, res, next) {
  try {
    if (!req.user) {
      try {
        req.user = getTokenPayload(req);
      } catch {
        req.user = null;
      }
    }

    // Business users are tenant-locked by their JWT. Headers and query params
    // are only hints for public pages and global admins.
    if (
      req.user?.businessId &&
      ["owner", "admin", "staff"].includes(req.user.role)
    ) {
      const business = await Business.findById(req.user.businessId).lean();
      if (!business) {
        return res.status(403).json({ error: "Business utente non valido" });
      }

      req.business = business;
      req.businessId = business._id;
      req.isDefaultBusiness = business.slug === DEFAULT_BUSINESS_SLUG;
      return next();
    }

    const slug =
      normalizeSlug(req.header("X-Business-Slug")) ||
      normalizeSlug(req.query.business) ||
      DEFAULT_BUSINESS_SLUG;
    const citySlug =
      normalizeSlug(req.header("X-City-Slug")) ||
      normalizeSlug(req.query.city) ||
      "";

    let business = citySlug
      ? await Business.findOne({ slug, "location.citySlug": citySlug }).lean()
      : null;

    if (!business) {
      business = await Business.findOne({ slug }).lean();
    }

    if (!business && slug === DEFAULT_BUSINESS_SLUG) {
      business = (await ensureDefaultBusiness()).toObject();
    }

    if (!business) {
      return res.status(404).json({ error: "Business non trovato" });
    }

    req.business = business;
    req.businessId = business._id;
    req.isDefaultBusiness = business.slug === DEFAULT_BUSINESS_SLUG;
    next();
  } catch (error) {
    next(error);
  }
}

// Applica businessId a ogni query Mongo. Il tenant di default include anche i
// documenti legacy senza businessId finche' la migrazione non e' completa.
function businessScope(req, filter = {}) {
  const scoped = { ...filter };
  const businessClause = req.isDefaultBusiness
    ? {
        $or: [
          { businessId: req.businessId },
          { businessId: { $exists: false } },
          { businessId: null },
        ],
      }
    : { businessId: req.businessId };

  if (scoped.$and) {
    scoped.$and = [businessClause, ...scoped.$and];
    return scoped;
  }

  return { $and: [businessClause, scoped] };
}

module.exports = { resolveBusiness, businessScope, normalizeSlug };
