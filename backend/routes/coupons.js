"use strict";

const router = require("express").Router();
const mongoose = require("mongoose");
const { Coupon } = require("../db");
const { requireBusinessRole } = require("../middleware/auth");
const { businessScope, resolveBusiness } = require("../middleware/business");
const asyncHandler = require("../middleware/asyncHandler");

// I coupon sono gestiti solo da owner/admin e sempre dentro il tenant corrente.
router.use(requireBusinessRole(["owner", "admin"]), resolveBusiness);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const coupons = await Coupon.find(businessScope(req))
      .sort({ createdAt: -1 })
      .lean();
    res.json({ coupons });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    // Validazione minima lato server per evitare coupon vuoti o sconti negativi.
    const { code, type, value, expiresAt, usageLimit, active } = req.body || {};

    if (!code?.trim()) return res.status(400).json({ error: "Codice obbligatorio" });
    if (!["percent", "fixed"].includes(type)) {
      return res.status(400).json({ error: "Tipo coupon non valido" });
    }
    if (Number(value) <= 0) {
      return res.status(400).json({ error: "Valore coupon non valido" });
    }

    const coupon = await Coupon.create({
      businessId: req.businessId,
      code,
      type,
      value: Number(value),
      expiresAt: expiresAt || "",
      usageLimit: Number(usageLimit) || 0,
      active: active !== false,
    });

    res.status(201).json(coupon);
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID non valido" });
    }

    // Allowlist: evita che campi non previsti vengano scritti sul documento.
    const allowed = ["code", "type", "value", "expiresAt", "usageLimit", "active"];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    if (update.value !== undefined) update.value = Number(update.value);
    if (update.usageLimit !== undefined) update.usageLimit = Number(update.usageLimit) || 0;

    const coupon = await Coupon.findOneAndUpdate(
      businessScope(req, { _id: req.params.id }),
      update,
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!coupon) return res.status(404).json({ error: "Coupon non trovato" });
    res.json(coupon);
  }),
);

router.patch(
  "/:id/toggle",
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID non valido" });
    }

    const coupon = await Coupon.findOne(
      businessScope(req, { _id: req.params.id }),
    );
    if (!coupon) return res.status(404).json({ error: "Coupon non trovato" });

    coupon.active = !coupon.active;
    await coupon.save();
    res.json(coupon);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID non valido" });
    }

    const coupon = await Coupon.findOneAndDelete(
      businessScope(req, { _id: req.params.id }),
    );
    if (!coupon) return res.status(404).json({ error: "Coupon non trovato" });
    res.json({ ok: true });
  }),
);

module.exports = router;
