const mongoose = require("mongoose");
const config = require("../config");

// ─────────────────────────────────────────────
// CONNECTION
// ─────────────────────────────────────────────

async function connect() {
  const uri = config?.mongo?.uri || process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("❌ MONGODB_URI mancante");
  }

  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () =>
    console.log("[db] 🟢 MongoDB connesso"),
  );

  mongoose.connection.on("error", (err) =>
    console.error("[db] 🔴 Errore MongoDB:", err.message),
  );

  mongoose.connection.on("disconnected", () =>
    console.warn("[db] 🟡 MongoDB disconnesso"),
  );

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
  } catch (err) {
    console.error("[db] ❌ Connessione fallita:", err.message);
    process.exit(1);
  }
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

const MenuItem = mongoose.model("MenuItem", menuItemSchema);

// ─────────────────────────────────────────────

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },
    name: String,
    price: Number,
    qty: { type: Number, min: 1, max: 20 },
  },
  { _id: false },
);

// ─────────────────────────────────────────────

const orderSchema = new mongoose.Schema(
  {
    customer: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, default: "" },
    notes: { type: String, default: "" },

    items: { type: [orderItemSchema], required: true },

    status: {
      type: String,
      enum: ["preparing", "ready", "done", "cancelled"],
      default: "preparing",
    },

    total: { type: Number, required: true, min: 0 },

    handledBy: { type: String, default: "" },
  },
  { timestamps: true },
);

// indexes
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ phone: 1 });

const Order = mongoose.model("Order", orderSchema);

// ─────────────────────────────────────────────
// SEED MENU (safe)
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
        name: "Coca Cola",
        description: "33cl",
        price: 2.5,
        category: "drink",
        emoji: "🥤",
      },
    ]);

    console.log("[db] 🍕 Menu seed completato");
  } catch (err) {
    console.error("[db] ❌ Seed error:", err.message);
  }
}

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

module.exports = {
  connect,
  seedMenu,
  models: {
    MenuItem,
    Order,
  },
};
