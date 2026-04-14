"use strict";

const router = require("express").Router();
const mongoose = require("mongoose");
const { Order } = require("../db");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const VALID_STATUSES = ["preparing", "ready", "done", "cancelled"];

// ─────────────────────────────────────────────
// GET /api/orders — admin con filtri e paginazione
// ─────────────────────────────────────────────
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { status, limit = 50, page = 1, from, to } = req.query;

    const filter = {};
    if (status && status !== "all" && VALID_STATUSES.includes(status)) {
      filter.status = status;
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const safeLimit = Math.min(Number(limit) || 50, 200);
    const safePage = Math.max(Number(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .skip(skip)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders,
      total,
      page: safePage,
      pages: Math.ceil(total / safeLimit),
    });
  }),
);

// ─────────────────────────────────────────────
// GET /api/orders/stats — admin dashboard
// ─────────────────────────────────────────────
router.get(
  "/stats",
  requireAuth,
  asyncHandler(async (req, res) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [statusAgg, revenueAgg] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: todayStart },
            status: { $ne: "cancelled" },
          },
        },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: todayStart },
            status: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$total" },
            orders: { $sum: 1 },
          },
        },
      ]),
    ]);

    const counts = { preparing: 0, ready: 0, done: 0 };
    for (const s of statusAgg)
      if (counts[s._id] !== undefined) counts[s._id] = s.count;

    res.json({
      today: {
        total: revenueAgg[0]?.orders || 0,
        revenue: Number((revenueAgg[0]?.revenue || 0).toFixed(2)),
        ...counts,
      },
    });
  }),
);

// ─────────────────────────────────────────────
// POST /api/orders — pubblico: crea ordine
// ─────────────────────────────────────────────
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { customer, phone = "", notes = "", items } = req.body || {};

    if (!customer?.trim()) {
      return res
        .status(400)
        .json({ error: "Il campo customer è obbligatorio" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ error: "Almeno un articolo è obbligatorio" });
    }

    const total = items.reduce((sum, i) => {
      return sum + (Number(i.price) || 0) * (Number(i.qty) || 1);
    }, 0);

    const order = await Order.create({
      customer: customer.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      items,
      total: Math.round(total * 100) / 100,
    });

    res.status(201).json(order);
  }),
);

// ─────────────────────────────────────────────
// GET /api/orders/:id — tracking pubblico
// ─────────────────────────────────────────────
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID non valido" });
    }

    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ error: "Ordine non trovato" });

    // Esponiamo solo i campi pubblici
    const { _id, customer, items, status, total, createdAt } = order;
    res.json({ _id, customer, items, status, total, createdAt });
  }),
);

// ─────────────────────────────────────────────
// PUT /api/orders/:id — admin: aggiorna stato
// ─────────────────────────────────────────────
router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { status, handledBy } = req.body || {};

    if (status && !VALID_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({
          error: `Stato non valido. Valori: ${VALID_STATUSES.join(", ")}`,
        });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID non valido" });
    }

    const update = {};
    if (status) update.status = status;
    if (handledBy) update.handledBy = handledBy;

    const order = await Order.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!order) return res.status(404).json({ error: "Ordine non trovato" });
    res.json(order);
  }),
);

// ─────────────────────────────────────────────
// DELETE /api/orders/:id — admin
// ─────────────────────────────────────────────
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID non valido" });
    }

    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: "Ordine non trovato" });
    res.json({ ok: true });
  }),
);

module.exports = router;
