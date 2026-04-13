const mongoose = require("mongoose");

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

// 🔥 FIX OVERWRITE ERROR
const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI mancante");

  await mongoose.connect(uri);
}

module.exports = {
  connect,
  Order,
};
