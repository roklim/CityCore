"use strict";

const router = require("express").Router();
const mongoose = require("mongoose");
const { Coupon } = require("../db");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json({ coupons });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { code, type, value, expiresAt, usageLimit, active } = req.body || {};

    if (!code?.trim()) return res.status(400).json({ error: "Codice obbligatorio" });
    if (!["percent", "fixed"].includes(type)) {
      return res.status(400).json({ error: "Tipo coupon non valido" });
    }
    if (Number(value) <= 0) {
      return res.status(400).json({ error: "Valore coupon non valido" });
    }

    const coupon = await Coupon.create({
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

    const allowed = ["code", "type", "value", "expiresAt", "usageLimit", "active"];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    if (update.value !== undefined) update.value = Number(update.value);
    if (update.usageLimit !== undefined) update.usageLimit = Number(update.usageLimit) || 0;

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

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

    const coupon = await Coupon.findById(req.params.id);
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

    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ error: "Coupon non trovato" });
    res.json({ ok: true });
  }),
);

module.exports = router;
