"use strict";

const router = require("express").Router();
const { resolveBusiness } = require("../middleware/business");
const { Business } = require("../db");
const asyncHandler = require("../middleware/asyncHandler");

function publicBusiness(business) {
  return {
    _id: business._id,
    name: business.name,
    slug: business.slug,
    type: business.type,
    plan: business.plan,
    subscriptionStatus: business.subscriptionStatus,
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
  "/public",
  asyncHandler(async (req, res) => {
    const businesses = await Business.find({
      subscriptionStatus: { $ne: "cancelled" },
    })
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
