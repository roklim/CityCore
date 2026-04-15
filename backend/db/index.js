"use strict";

const mongoose = require("mongoose");
const config = require("../config");

// ─────────────────────────────────────────────
// CONNECTION
// ─────────────────────────────────────────────

let isConnected = false;

async function connect() {
  if (isConnected) return;

  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () =>
    console.log("[db] 🟢 MongoDB connesso"),
  );
  mongoose.connection.on("error", (err) =>
    console.error("[db] 🔴 Errore:", err.message),
  );
  mongoose.connection.on("disconnected", () =>
    console.warn("[db] 🟡 Disconnesso"),
  );

  await mongoose.connect(config.mongo.uri, {
    serverSelectionTimeoutMS: 8000,
  });

  isConnected = true;
}

// ─────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: ["pizza", "drink", "dessert", "extra"],
      default: "pizza",
    },
    available: { type: Boolean, default: true },
    emoji: { type: String, default: "🍕" },
  },
  { timestamps: true },
);

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1, max: 20 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    customer: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, default: "", trim: true },
    notes: { type: String, default: "" },
    items: { type: [orderItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    pickupDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    pickupTime: {
      type: String,
      required: true,
      match: /^\d{2}:\d{2}$/,
    },
    pickupSlot: {
      type: String,
      required: true,
      index: true,
      match: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    },
    status: {
      type: String,
      enum: ["preparing", "ready", "done", "cancelled"],
      default: "preparing",
    },
    handledBy: { type: String, default: "" },
  },
  { timestamps: true },
);

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ pickupDate: 1, pickupTime: 1 });

// ── Guard against model overwrite (Vercel hot-reload) ──────
const MenuItem =
  mongoose.models.MenuItem || mongoose.model("MenuItem", menuItemSchema);

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

// ─────────────────────────────────────────────
// SEED
// ─────────────────────────────────────────────

async function seedMenu() {
  try {
    const count = await MenuItem.countDocuments();
    if (count > 0) return;

    await MenuItem.insertMany([
      {
        name: "Margherita",
        description: "Pomodoro, fior di latte, basilico",
        price: 8.5,
        category: "pizza",
        emoji: "🍕",
      },
      {
        name: "Diavola",
        description: "Pomodoro, mozzarella, salame piccante",
        price: 10,
        category: "pizza",
        emoji: "🌶️",
      },
      {
        name: "Quattro Formaggi",
        description: "Mozzarella, gorgonzola, brie, parmigiano",
        price: 11,
        category: "pizza",
        emoji: "🧀",
      },
      {
        name: "Prosciutto",
        description: "Pomodoro, mozzarella, prosciutto cotto",
        price: 10,
        category: "pizza",
        emoji: "🥩",
      },
      {
        name: "Coca Cola",
        description: "33cl",
        price: 2.5,
        category: "drink",
        emoji: "🥤",
      },
      {
        name: "Acqua",
        description: "50cl naturale o frizzante",
        price: 1.5,
        category: "drink",
        emoji: "💧",
      },
      {
        name: "Tiramisù",
        description: "Fatto in casa",
        price: 4.5,
        category: "dessert",
        emoji: "☕",
      },
    ]);

    console.log("[db] 🍕 Seed menu completato");
  } catch (err) {
    console.error("[db] ❌ Seed error:", err.message);
  }
}

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

module.exports = { connect, seedMenu, MenuItem, Order };
