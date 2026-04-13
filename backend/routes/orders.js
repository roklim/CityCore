// routes/orders.js
const router = require("express").Router();
const mongoose = require("mongoose");

const { Order } = require("../db").models;
const { requireAuth } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/asyncHandler");
const { asyncHandler } = require("../middleware/errorHandler");

// ─────────────────────────────────────────────
// GET ALL ORDERS (ADMIN)
// ─────────────────────────────────────────────
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { status, limit = 50, page = 1, from, to } = req.query;

    const filter = {};

    if (status && status !== "all") {
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
// STATS (ADMIN DASHBOARD)
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
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
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

    const counts = {
      preparing: 0,
      ready: 0,
      done: 0,
    };

    for (const s of statusAgg) {
      counts[s._id] = s.count;
    }

    const revenue = revenueAgg?.[0]?.revenue || 0;
    const totalOrders = revenueAgg?.[0]?.orders || 0;

    res.json({
      today: {
        total: totalOrders,
        revenue: Number(revenue.toFixed(2)),
        preparing: counts.preparing,
        ready: counts.ready,
        done: counts.done,
      },
    });
  }),
);

// ─────────────────────────────────────────────
// CREATE ORDER (PUBLIC)
// ─────────────────────────────────────────────
router.post(
  "/",
  validate(schemas.createOrder),
  asyncHandler(async (req, res) => {
    const { customer, phone = "", notes = "", items } = req.body;

    const total = items.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 1;
      return sum + price * qty;
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
// GET ORDER BY ID (PUBLIC TRACKING)
// ─────────────────────────────────────────────
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID non valido" });
    }

    const order = await Order.findById(id).lean();

    if (!order) {
      return res.status(404).json({ error: "Ordine non trovato" });
    }

    res.json(order);
  }),
);

// ─────────────────────────────────────────────
// UPDATE STATUS (ADMIN)
// ─────────────────────────────────────────────
router.put(
  "/:id",
  requireAuth,
  validate(schemas.updateStatus),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, handledBy } = req.body;

    const order = await Order.findByIdAndUpdate(
      id,
      {
        status,
        ...(handledBy ? { handledBy } : {}),
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!order) {
      return res.status(404).json({ error: "Ordine non trovato" });
    }

    res.json(order);
  }),
);

// ─────────────────────────────────────────────
// DELETE ORDER (ADMIN)
// ─────────────────────────────────────────────
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res.status(404).json({ error: "Ordine non trovato" });
    }

    res.json({ ok: true });
  }),
);

module.exports = router;
