const mongoose = require("mongoose");

async function connect() {
  const uri = process.env.MONGODB_URI;

  if (!uri) throw new Error("MONGODB_URI mancante");

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri);

  console.log("🟢 MongoDB connesso");
}

const OrderSchema = new mongoose.Schema({
  customer: String,
  phone: String,
  notes: String,
  items: Array,
  total: Number,
  status: {
    type: String,
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 🔥 FIX IMPORTANTE
const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);

module.exports = {
  connect,
  Order,
};
