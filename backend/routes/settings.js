"use strict";

const router = require("express").Router();
const { StoreSettings } = require("../db");
const { requireBusinessRole } = require("../middleware/auth");
const { businessScope, resolveBusiness } = require("../middleware/business");
const asyncHandler = require("../middleware/asyncHandler");

// Settings sono modificabili solo da owner/admin: lo staff operativo non deve
// cambiare orari, ordine minimo o messaggi pubblici del locale.
router.use(requireBusinessRole(["owner", "admin"]), resolveBusiness);

async function getSettingsDocument(req) {
  // Documento lazy: se un business appena creato non ha settings, li creiamo al
  // primo accesso mantenendo il pannello admin sempre funzionante.
  let settings = await StoreSettings.findOne(businessScope(req));
  if (!settings) {
    settings = await StoreSettings.create({ businessId: req.businessId });
  }
  return settings;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await getSettingsDocument(req));
  }),
);

router.put(
  "/",
  asyncHandler(async (req, res) => {
    const settings = await getSettingsDocument(req);
    const allowed = [
      "openingHours",
      "deliveryCost",
      "minimumOrder",
      "serviceZones",
      "customerMessage",
    ];

    // Aggiorniamo solo i campi noti, cosi' payload extra non finiscono nel DB.
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
