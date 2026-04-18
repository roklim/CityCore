"use strict";

const router = require("express").Router();
const { resolveBusiness } = require("../middleware/business");
const asyncHandler = require("../middleware/asyncHandler");

// Route pubblica per risolvere il business corrente da slug/header/query.
// Serve al frontend per adattare nome, branding e feature senza esporre dati admin.
router.use(resolveBusiness);

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

router.get(
  "/current",
  asyncHandler(async (req, res) => {
    res.json({ business: publicBusiness(req.business) });
  }),
);

module.exports = router;
