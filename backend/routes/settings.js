"use strict";

const router = require("express").Router();
const { Business, StoreSettings } = require("../db");
const { requireBusinessRole } = require("../middleware/auth");
const { businessScope, resolveBusiness } = require("../middleware/business");
const asyncHandler = require("../middleware/asyncHandler");
const OPENING_DAYS = new Set(["lun", "mar", "mer", "gio", "ven", "sab", "dom"]);
const TIME_RE = /^\d{2}:\d{2}$/;

// Settings sono modificabili solo da owner/admin: lo staff operativo non deve
// cambiare orari, ordine minimo o messaggi pubblici del locale.
router.use(requireBusinessRole(["owner", "admin"]), resolveBusiness);

async function getSettingsDocument(req) {
  // Documento lazy: se un business appena creato non ha settings, li creiamo al
  // primo accesso mantenendo il pannello admin sempre funzionante.
  let settings = await StoreSettings.findOne(businessScope(req));
  if (!settings) {
    settings = await StoreSettings.create({
      businessId: req.businessId,
      openingHours: req.business?.settings?.openingHours || undefined,
      openingDays: req.business?.settings?.openingDays || undefined,
      openingTimeStart: req.business?.settings?.openingTimeStart || undefined,
      openingTimeEnd: req.business?.settings?.openingTimeEnd || undefined,
      customerMessage: req.business?.settings?.publicMessage || undefined,
    });
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
      "openingDays",
      "openingTimeStart",
      "openingTimeEnd",
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
    settings.openingDays = Array.isArray(settings.openingDays)
      ? settings.openingDays.filter((day) => OPENING_DAYS.has(day))
      : [];
    if (!TIME_RE.test(settings.openingTimeStart || "")) {
      settings.openingTimeStart = "18:00";
    }
    if (!TIME_RE.test(settings.openingTimeEnd || "")) {
      settings.openingTimeEnd = "22:30";
    }
    if (
      settings.openingDays.length > 0 &&
      settings.openingTimeStart >= settings.openingTimeEnd
    ) {
      return res
        .status(400)
        .json({ error: "L'orario di chiusura deve essere dopo l'apertura" });
    }
    if (!Array.isArray(settings.serviceZones)) settings.serviceZones = [];

    await settings.save();
    await Business.findByIdAndUpdate(req.businessId, {
      $set: {
        "settings.openingHours": settings.openingHours,
        "settings.openingDays": settings.openingDays,
        "settings.openingTimeStart": settings.openingTimeStart,
        "settings.openingTimeEnd": settings.openingTimeEnd,
        "settings.publicMessage": settings.customerMessage,
      },
    });
    res.json(settings);
  }),
);

module.exports = router;
