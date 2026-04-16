"use strict";

const router = require("express").Router();
const mongoose = require("mongoose");
const { Customer, Order } = require("../db");
const config = require("../config");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { normalizePhone } = require("./customers");

const VALID_STATUSES = ["preparing", "ready", "done", "cancelled"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const POINTS_PER_COMPLETED_ORDER = 1;

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function buildPickupSlot(date, time) {
  return `${date}T${time}`;
}

function flexiblePhoneRegex(phone) {
  return new RegExp(phone.split("").join("\\D*"));
}

function buildPhoneSearchFilter(phone) {
  const candidates = new Set([phone]);

  if (phone.startsWith("39") && phone.length > 10) {
    candidates.add(phone.slice(2));
  } else {
    candidates.add(`39${phone}`);
  }

  return {
    $or: Array.from(candidates)
      .filter((candidate) => candidate.length >= 6)
      .flatMap((candidate) => [
        { phone: candidate },
        { phone: { $regex: flexiblePhoneRegex(candidate) } },
      ]),
  };
}

function getPickupNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: config.pickup.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const valueByType = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return {
    date: `${valueByType.year}-${valueByType.month}-${valueByType.day}`,
    minutes: timeToMinutes(`${valueByType.hour}:${valueByType.minute}`),
  };
}

function isPastSlot(date, time) {
  const now = getPickupNow();
  if (date < now.date) return true;
  if (date > now.date) return false;
  return (
    timeToMinutes(time) <
    now.minutes + config.pickup.minPreparationMinutes
  );
}

function isClosedDate(date) {
  const weekday = new Date(`${date}T12:00:00`).getDay();
  return config.pickup.closedWeekdays.includes(weekday);
}

function generateSlots(date) {
  const start = timeToMinutes(config.pickup.startTime);
  const end = timeToMinutes(config.pickup.endTime);
  const step = Math.max(Number(config.pickup.slotMinutes) || 15, 5);
  const slots = [];

  for (let current = start; current <= end; current += step) {
    const time = minutesToTime(current);
    slots.push({ time, pickupSlot: buildPickupSlot(date, time) });
  }

  return slots;
}

async function buildAvailability(date) {
  if (isClosedDate(date)) {
    return {
      date,
      closed: true,
      maxOrdersPerSlot: config.pickup.maxOrdersPerSlot,
      slotMinutes: config.pickup.slotMinutes,
      startTime: config.pickup.startTime,
      endTime: config.pickup.endTime,
      slots: [],
    };
  }

  const counts = await Order.aggregate([
    {
      $match: {
        pickupDate: date,
        status: { $ne: "cancelled" },
      },
    },
    {
      $group: {
        _id: "$pickupSlot",
        count: { $sum: 1 },
      },
    },
  ]);

  const countBySlot = new Map(counts.map((slot) => [slot._id, slot.count]));
  const maxOrdersPerSlot = config.pickup.maxOrdersPerSlot;

  const slots = generateSlots(date).map((slot) => {
    const count = countBySlot.get(slot.pickupSlot) || 0;
    const remaining = Math.max(maxOrdersPerSlot - count, 0);

    return {
      ...slot,
      count,
      remaining,
      full: remaining === 0,
      almostFull: remaining > 0 && remaining <= 1,
      past: isPastSlot(date, slot.time),
    };
  });

  return {
    date,
    maxOrdersPerSlot,
    slotMinutes: config.pickup.slotMinutes,
    startTime: config.pickup.startTime,
    endTime: config.pickup.endTime,
    slots,
  };
}

function validatePickup({ pickupDate, pickupTime, pickupSlot }) {
  if (!DATE_RE.test(pickupDate || "")) {
    return "pickupDate obbligatoria nel formato YYYY-MM-DD";
  }
  if (!TIME_RE.test(pickupTime || "")) {
    return "pickupTime obbligatoria nel formato HH:mm";
  }
  if (pickupSlot !== buildPickupSlot(pickupDate, pickupTime)) {
    return "pickupSlot non corrisponde a pickupDate e pickupTime";
  }

  const allowedSlots = new Set(
    generateSlots(pickupDate).map((slot) => slot.pickupSlot),
  );

  if (!allowedSlots.has(pickupSlot)) return "Fascia oraria non disponibile";
  if (isClosedDate(pickupDate)) return "Giorno di chiusura";
  if (isPastSlot(pickupDate, pickupTime)) return "Fascia oraria gia passata";
  return "";
}

// ─────────────────────────────────────────────
// GET /api/orders — admin con filtri e paginazione
// ─────────────────────────────────────────────
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { status, limit = 50, page = 1, from, to, pickupDate } = req.query;

    const filter = {};
    if (status && status !== "all" && VALID_STATUSES.includes(status)) {
      filter.status = status;
    }
    if (pickupDate && DATE_RE.test(pickupDate)) {
      filter.pickupDate = pickupDate;
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
        .sort({ pickupDate: 1, pickupTime: 1, createdAt: -1 })
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
router.get(
  "/availability",
  asyncHandler(async (req, res) => {
    const { date } = req.query;

    if (!DATE_RE.test(date || "")) {
      return res
        .status(400)
        .json({ error: "Parametro date obbligatorio nel formato YYYY-MM-DD" });
    }

    res.json(await buildAvailability(date));
  }),
);

// GET /api/orders/customer?phone=... - pubblico: ultimi ordini del cliente
router.get(
  "/customer",
  asyncHandler(async (req, res) => {
    const phone = normalizePhone(req.query.phone || "");

    if (phone.length < 6) {
      return res
        .status(400)
        .json({ error: "Inserisci un numero di telefono valido" });
    }

    const orders = await Order.find(buildPhoneSearchFilter(phone))
      .sort({ createdAt: -1 })
      .limit(8)
      .select(
        "_id customer items status total pickupDate pickupTime pickupSlot createdAt",
      )
      .lean();

    res.json({ orders });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      customer,
      phone = "",
      notes = "",
      items,
      pickupDate,
      pickupTime,
      pickupSlot,
    } = req.body || {};

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

    const pickupError = validatePickup({ pickupDate, pickupTime, pickupSlot });
    if (pickupError) {
      return res.status(400).json({ error: pickupError });
    }

    const activeOrdersInSlot = await Order.countDocuments({
      pickupSlot,
      status: { $ne: "cancelled" },
    });

    if (activeOrdersInSlot >= config.pickup.maxOrdersPerSlot) {
      return res.status(409).json({
        error: "Questa fascia oraria e piena. Scegli un altro orario.",
      });
    }

    const total = items.reduce((sum, i) => {
      return sum + (Number(i.price) || 0) * (Number(i.qty) || 1);
    }, 0);

    const order = await Order.create({
      customer: customer.trim(),
      phone: normalizePhone(phone),
      notes: notes.trim(),
      items,
      total: Math.round(total * 100) / 100,
      pickupDate,
      pickupTime,
      pickupSlot,
    });

    if (order.phone) {
      await Customer.findOneAndUpdate(
        { phone: order.phone },
        {
          $set: {
            name: order.customer,
            lastOrder: order._id,
            lastOrderAt: order.createdAt,
          },
          $inc: { totalOrders: 1 },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
    }

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
    const {
      _id,
      customer,
      items,
      status,
      total,
      pickupDate,
      pickupTime,
      pickupSlot,
      createdAt,
    } = order;
    res.json({
      _id,
      customer,
      items,
      status,
      total,
      pickupDate,
      pickupTime,
      pickupSlot,
      createdAt,
    });
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

    if (status === "done" && order.phone && !order.loyaltyAwarded) {
      await Customer.findOneAndUpdate(
        { phone: normalizePhone(order.phone) },
        {
          $set: {
            name: order.customer,
            lastOrder: order._id,
            lastOrderAt: order.createdAt,
          },
          $inc: {
            points: POINTS_PER_COMPLETED_ORDER,
            completedOrders: 1,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );

      order.loyaltyAwarded = true;
      await order.save();
    }

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
