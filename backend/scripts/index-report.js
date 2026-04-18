"use strict";

const mongoose = require("mongoose");
const { connect } = require("../db");

const COLLECTIONS = ["businesses", "menuitems", "orders", "customers", "coupons"];
const LEGACY_UNIQUE_INDEXES = {
  menuitems: ["name_1"],
  customers: ["phone_1"],
  coupons: ["code_1"],
};

// Report indici Mongo: aiuta a trovare vecchi indici unici globali che
// bloccherebbero due business con stessi nomi prodotto/codici coupon/telefoni.
async function main() {
  await connect();
  const db = mongoose.connection.db;

  console.log(`[index-report] Database: ${db.databaseName}`);

  for (const collectionName of COLLECTIONS) {
    const exists = await db
      .listCollections({ name: collectionName })
      .hasNext();

    if (!exists) {
      console.log(`[index-report] ${collectionName}: collection non presente`);
      continue;
    }

    const indexes = await db.collection(collectionName).indexes();
    console.log(`\n[index-report] ${collectionName}`);
    for (const index of indexes) {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}${index.unique ? " unique" : ""}`);
    }

    const legacy = LEGACY_UNIQUE_INDEXES[collectionName] || [];
    for (const indexName of legacy) {
      if (indexes.some((index) => index.name === indexName && index.unique)) {
        console.log(
          `  ATTENZIONE: indice legacy globale ${indexName}. Valuta dropIndex("${indexName}") dopo backup.`,
        );
      }
    }
  }
}

main()
  .catch((error) => {
    console.error("[index-report] Errore:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
