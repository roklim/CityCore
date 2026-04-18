"use strict";

const router = require("express").Router();
const { StoreSettings } = require("../db");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

router.use(requireAuth);

async function getSettingsDocument() {
  let settings = await StoreSettings.findOne();
  if (!settings) settings = await StoreSettings.create({});
  return settings;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await getSettingsDocument());
  }),
);

router.put(
  "/",
  asyncHandler(async (req, res) => {
    const settings = await getSettingsDocument();
    const allowed = [
      "openingHours",
      "deliveryCost",
      "minimumOrder",
      "serviceZones",
      "customerMessage",
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) settings[key] = req.body[key];
    }

    settings.deliveryCost = Number(settings.deliveryCost) || 0;
    settings.minimumOrder = Number(settings.minimumOrder) || 0;
    if (!Array.isArray(settings.serviceZones)) settings.serviceZones = [];

    await settings.save();
    res.json(settings);
  }),
);

module.exports = router;
