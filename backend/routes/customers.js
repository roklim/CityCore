"use strict";

const router = require("express").Router();
const { Customer, Order } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { businessScope, resolveBusiness } = require("../middleware/business");
const asyncHandler = require("../middleware/asyncHandler");

// I telefoni vengono salvati in formato numerico compatto per ricerca semplice
// e per evitare duplicati dovuti a spazi, +39 o trattini.
function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

// Nel lookup pubblico non esponiamo dati admin o note interne: solo riepilogo
// utile al cliente.
function publicOrder(order) {
  if (!order) return null;

  return {
    _id: order._id,
    items: order.items,
    total: order.total,
    pickupDate: order.pickupDate,
    pickupTime: order.pickupTime,
    pickupSlot: order.pickupSlot,
    status: order.status,
    createdAt: order.createdAt,
  };
}

// Tutte le query clienti sono isolate per business.
router.use(resolveBusiness);

// GET /api/customers/lookup?phone=...
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    // Ricerca admin per nome o telefono, con metriche aggregate sugli ordini.
    const query = String(req.query.q || "").trim();
    let filter = businessScope(req);

    if (query) {
      const phone = normalizePhone(query);
      filter = businessScope(req, {
        $or: [
          { name: { $regex: query, $options: "i" } },
          ...(phone ? [{ phone: { $regex: phone } }] : []),
        ],
      });
    }

    const customers = await Customer.find(filter)
      .sort({ lastOrderAt: -1, updatedAt: -1 })
      .limit(80)
      .lean();

    const phones = customers.map((customer) => customer.phone).filter(Boolean);
    const orderAgg = await Order.aggregate([
      {
        $match: businessScope(req, {
          phone: { $in: phones },
        }),
      },
      {
        $group: {
          _id: "$phone",
          totalSpent: { $sum: "$total" },
          lastOrderTotal: { $last: "$total" },
        },
      },
    ]);
    const orderStats = new Map(orderAgg.map((item) => [item._id, item]));

    res.json({
      customers: customers.map((customer) => ({
        ...customer,
        totalSpent: Number((orderStats.get(customer.phone)?.totalSpent || 0).toFixed(2)),
      })),
    });
  }),
);

router.get(
  "/lookup",
  asyncHandler(async (req, res) => {
    // Lookup pubblico usato dal checkout: recupera fidelita e ultimo ordine
    // senza richiedere account cliente.
    const phone = normalizePhone(req.query.phone);

    if (phone.length < 6) {
      return res
        .status(400)
        .json({ error: "Inserisci un numero di telefono valido" });
    }

    let customer = await Customer.findOne(
      businessScope(req, { phone }),
    ).lean();
    const lastOrder = await Order.findOne(
      businessScope(req, {
        phone,
        status: { $ne: "cancelled" },
      }),
    )
      .sort({ createdAt: -1 })
      .lean();

    if (!customer && lastOrder) {
      // Backfill pigro: se esistono ordini storici ma manca il Customer,
      // creiamo il profilo al primo lookup invece di lanciare migrazioni pesanti.
      const [totalOrders, completedOrders] = await Promise.all([
        Order.countDocuments(businessScope(req, { phone })),
        Order.countDocuments(businessScope(req, { phone, status: "done" })),
      ]);

      customer = await Customer.findOneAndUpdate(
        { businessId: req.businessId, phone },
        {
          $set: {
            businessId: req.businessId,
            name: lastOrder.customer,
            lastOrder: lastOrder._id,
            lastOrderAt: lastOrder.createdAt,
            totalOrders,
            completedOrders,
            points: completedOrders,
          },
        },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
      ).lean();
    }

    if (!customer) return res.json({ found: false });

    res.json({
      found: true,
      customer: {
        name: customer.name,
        phone: customer.phone,
        points: customer.points,
        completedOrders: customer.completedOrders,
        totalOrders: customer.totalOrders,
      },
      lastOrder: publicOrder(lastOrder),
    });
  }),
);

module.exports = { router, normalizePhone };
