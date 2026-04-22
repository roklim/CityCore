"use strict";

const router = require("express").Router();
const { resolveBusiness } = require("../middleware/business");
const { Business, City } = require("../db");
const asyncHandler = require("../middleware/asyncHandler");

function publicCity(city) {
  return {
    _id: city._id,
    registryId: city.registryId,
    name: city.name,
    slug: city.slug,
    province: city.province,
    region: city.region,
    country: city.country,
    lat: city.lat,
    lng: city.lng,
    active: city.active,
    status: city.status || "active",
    heroTitle: city.heroTitle || "",
    heroDescription: city.heroDescription || "",
    enabledModules: city.enabledModules || {},
  };
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function publicBusiness(business) {
  return {
    _id: business._id,
    name: business.name,
    slug: business.slug,
    type: business.type,
    plan: business.plan,
    subscriptionStatus: business.subscriptionStatus,
    cityId: business.cityId,
    location: business.location,
    branding: business.branding,
    features: business.features,
    settings: business.settings,
  };
}

function publicBusinessDirectoryItem(business) {
  return {
    _id: business._id,
    name: business.name,
    slug: business.slug,
    type: business.type,
    cityId: business.cityId,
    location: business.location,
    branding: business.branding,
    features: business.features,
    settings: {
      publicMessage: business.settings?.publicMessage || "",
      openingHours: business.settings?.openingHours || "",
      timezone: business.settings?.timezone || "Europe/Rome",
      locale: business.settings?.locale || "it-IT",
    },
  };
}

router.get(
  "/cities",
  asyncHandler(async (req, res) => {
    const cities = await City.find({ active: true, status: { $ne: "disabled" } })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    res.json({ cities: cities.map(publicCity) });
  }),
);

router.get(
  "/cities/search",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "").trim();
    const filter = { active: true, status: { $ne: "disabled" } };
    if (q) {
      const normalized = q
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const safe = escapeRegex(q);
      filter.$or = [
        { name: new RegExp(safe, "i") },
        { slug: new RegExp(escapeRegex(normalized), "i") },
        { province: new RegExp(safe, "i") },
        { region: new RegExp(safe, "i") },
      ];
    }

    const cities = await City.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .limit(20)
      .lean();
    res.json({ cities: cities.map(publicCity) });
  }),
);

router.get(
  "/cities/:slug",
  asyncHandler(async (req, res) => {
    const city = await City.findOne({
      slug: req.params.slug,
      active: true,
      status: { $ne: "disabled" },
    }).lean();
    if (!city) return res.status(404).json({ error: "Citta non trovata" });
    res.json({ city: publicCity(city) });
  }),
);

router.get(
  "/public",
  asyncHandler(async (req, res) => {
    const citySlug = String(req.query.city || "").trim().toLowerCase();
    const filter = {
      subscriptionStatus: { $ne: "cancelled" },
    };
    if (citySlug) filter["location.citySlug"] = citySlug;

    const businesses = await Business.find(filter)
      .sort({ name: 1 })
      .lean();

    res.json({ businesses: businesses.map(publicBusinessDirectoryItem) });
  }),
);

// Route pubblica per risolvere il business corrente da slug/header/query.
// Serve al frontend per adattare nome, branding e feature senza esporre dati admin.
router.use(resolveBusiness);

router.get(
  "/current",
  asyncHandler(async (req, res) => {
    res.json({ business: publicBusiness(req.business) });
  }),
);

module.exports = router;
