// db/index.js
// Connessione MongoDB (Render-ready)

const mongoose = require("mongoose");

async function connect() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("❌ MONGODB_URI mancante nelle variabili ambiente");
  }

  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () => console.log("🟢 MongoDB connesso"));

  mongoose.connection.on("error", (err) =>
    console.error("🔴 Errore MongoDB:", err.message),
  );

  mongoose.connection.on("disconnected", () =>
    console.warn("🟡 MongoDB disconnesso"),
  );

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });
}

module.exports = { connect };
