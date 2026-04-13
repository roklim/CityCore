const mongoose = require("mongoose");

// ── SCHEMAS ─────────────────────────────

const MenuItemSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  emoji: String,
  available: { type: Boolean, default: true },
});

const OrderSchema = new mongoose.Schema(
  {
    customer: String,
    phone: String,
    notes: String,
    items: Array,
    total: Number,
    status: {
      type: String,
      default: "preparing",
    },
  },
  { timestamps: true },
);

// ── FIX OVERWRITE ERROR ────────────────

const MenuItem =
  mongoose.models.MenuItem || mongoose.model("MenuItem", MenuItemSchema);

const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);

// ── CONNECT ─────────────────────────────

async function connect() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI mancante");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri);

  console.log("🟢 MongoDB connesso");
}

// ── EXPORT CORRETTO ─────────────────────

module.exports = {
  connect,
  MenuItem,
  Order,
};
