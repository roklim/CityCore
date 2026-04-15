"use strict";

const router = require("express").Router();
const { Customer, Order } = require("../db");
const asyncHandler = require("../middleware/asyncHandler");

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

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

// GET /api/customers/lookup?phone=...
router.get(
  "/lookup",
  asyncHandler(async (req, res) => {
    const phone = normalizePhone(req.query.phone);

    if (phone.length < 6) {
      return res
        .status(400)
        .json({ error: "Inserisci un numero di telefono valido" });
    }

    let customer = await Customer.findOne({ phone }).lean();
    const lastOrder = await Order.findOne({
      phone,
      status: { $ne: "cancelled" },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!customer && lastOrder) {
      const [totalOrders, completedOrders] = await Promise.all([
        Order.countDocuments({ phone }),
        Order.countDocuments({ phone, status: "done" }),
      ]);

      customer = await Customer.findOneAndUpdate(
        { phone },
        {
          $set: {
            name: lastOrder.customer,
            lastOrder: lastOrder._id,
            lastOrderAt: lastOrder.createdAt,
            totalOrders,
            completedOrders,
            points: completedOrders,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
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
