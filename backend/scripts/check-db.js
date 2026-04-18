"use strict";

const mongoose = require("mongoose");
const {
  Business,
  Coupon,
  Customer,
  MenuItem,
  Order,
  StoreSettings,
  connect,
} = require("../db");

const MODELS = [
  ["businesses", Business],
  ["menuitems", MenuItem],
  ["orders", Order],
  ["customers", Customer],
  ["coupons", Coupon],
  ["storesettings", StoreSettings],
];

// Script diagnostico non distruttivo: conta documenti e segnala eventuali record
// legacy senza businessId, utile prima/dopo migrazioni multi-tenant.
async function main() {
  await connect();

  const db = mongoose.connection.db;
  console.log(`[check-db] Database: ${db.databaseName}`);

  for (const [name, model] of MODELS) {
    const count = await model.countDocuments();
    const missingBusinessId =
      name === "businesses"
        ? 0
        : await model.countDocuments({
            $or: [{ businessId: { $exists: false } }, { businessId: null }],
          });

    console.log(
      `[check-db] ${name}: ${count} documenti${
        missingBusinessId ? `, ${missingBusinessId} senza businessId` : ""
      }`,
    );
  }

  const collections = await db.listCollections().toArray();
  console.log(
    `[check-db] Collections: ${collections
      .map((collection) => collection.name)
      .sort()
      .join(", ")}`,
  );
}

main()
  .catch((error) => {
    console.error("[check-db] Errore:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
