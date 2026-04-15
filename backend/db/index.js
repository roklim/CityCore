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
      enum: [
        "pizza",
        "pizze-tonde",
        "pizza-teglia",
        "fritti",
        "drink",
        "bevande",
        "dolci",
        "dessert",
        "extra",
      ],
      default: "pizza",
    },
    available: { type: Boolean, default: true },
    emoji: { type: String, default: "🍕" },
    sortOrder: { type: Number, default: 0 },
    unit: {
      type: String,
      enum: ["pezzo", "porzione", "trancio", "teglia", "lattina", "bottiglia"],
      default: "pezzo",
    },
    tags: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1, max: 20 },
    notes: { type: String, default: "", trim: true, maxlength: 160 },
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
    loyaltyAwarded: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true },
    points: { type: Number, default: 0, min: 0 },
    completedOrders: { type: Number, default: 0, min: 0 },
    totalOrders: { type: Number, default: 0, min: 0 },
    lastOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    lastOrderAt: { type: Date },
  },
  { timestamps: true },
);

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ pickupDate: 1, pickupTime: 1 });
menuItemSchema.index({ category: 1, sortOrder: 1, name: 1 });
customerSchema.index({ phone: 1 }, { unique: true });

// ── Guard against model overwrite (Vercel hot-reload) ──────
const MenuItem =
  mongoose.models.MenuItem || mongoose.model("MenuItem", menuItemSchema);

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
const Customer =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);

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
        category: "pizze-tonde",
        emoji: "🍕",
        sortOrder: 10,
      },
      {
        name: "Diavola",
        description: "Pomodoro, mozzarella, salame piccante",
        price: 10,
        category: "pizze-tonde",
        emoji: "🌶️",
        sortOrder: 20,
        tags: ["piccante"],
      },
      {
        name: "Quattro Formaggi",
        description: "Mozzarella, gorgonzola, brie, parmigiano",
        price: 11,
        category: "pizze-tonde",
        emoji: "🧀",
        sortOrder: 30,
      },
      {
        name: "Prosciutto",
        description: "Pomodoro, mozzarella, prosciutto cotto",
        price: 10,
        category: "pizze-tonde",
        emoji: "🥩",
        sortOrder: 40,
      },
      {
        name: "Margherita in teglia",
        description: "Trancio alto e soffice con pomodoro e mozzarella",
        price: 4,
        category: "pizza-teglia",
        emoji: "🍕",
        sortOrder: 10,
        unit: "trancio",
      },
      {
        name: "Suppli al telefono",
        description: "Riso, pomodoro e cuore filante",
        price: 2.5,
        category: "fritti",
        emoji: "🧆",
        sortOrder: 10,
      },
      {
        name: "Patatine fritte",
        description: "Porzione croccante",
        price: 3.5,
        category: "fritti",
        emoji: "🍟",
        sortOrder: 20,
        unit: "porzione",
      },
      {
        name: "Coca Cola",
        description: "33cl",
        price: 2.5,
        category: "bevande",
        emoji: "🥤",
        sortOrder: 10,
        unit: "lattina",
      },
      {
        name: "Acqua",
        description: "50cl naturale o frizzante",
        price: 1.5,
        category: "bevande",
        emoji: "💧",
        sortOrder: 20,
        unit: "bottiglia",
      },
      {
        name: "Tiramisù",
        description: "Fatto in casa",
        price: 4.5,
        category: "dolci",
        emoji: "☕",
        sortOrder: 10,
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

module.exports = { connect, seedMenu, MenuItem, Order, Customer };
