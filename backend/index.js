"use strict";

// Adattatore serverless/legacy. Il comando locale usa server.js, ma questo file
// resta utile se un provider importa direttamente il backend come handler.

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const config = require("./config");
const { connect, seedMenu } = require("./db");
const { errorHandler } = require("./middleware/errorHandler");

const authRouter = require("./routes/auth");
const customersRouter = require("./routes/customers").router;
const ordersRouter = require("./routes/orders");
const menuRouter = require("./routes/menu");
const couponsRouter = require("./routes/coupons");
const settingsRouter = require("./routes/settings");
const businessesRouter = require("./routes/businesses");
const platformRouter = require("./routes/platform");

const app = express();

// Stessa pipeline di server.js, mantenuta qui per compatibilita serverless.
app.use(helmet());
app.use(
  cors({
    origin: config.cors.origin === "*" ? true : config.cors.origin,
  }),
);
app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Troppe richieste, riprova piu tardi." },
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(
  morgan(config.isProd ? "combined" : "dev", {
    skip: (req) => req.url === "/health",
  }),
);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "pizzeria-api",
    time: new Date().toISOString(),
    env: config.nodeEnv,
  });
});

// Route aggiornate al core multi-business.
app.use("/api/auth", authRouter);
app.use("/api/business", businessesRouter);
app.use("/api/platform", platformRouter);
app.use("/api/customers", customersRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/menu", menuRouter);
app.use("/api/coupons", couponsRouter);
app.use("/api/settings", settingsRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint non trovato" });
});

app.use(errorHandler);

if (require.main === module) {
  (async () => {
    try {
      console.log("[serverless-adapter] Avvio diretto...");

      await connect();
      await seedMenu();

      const server = app.listen(config.port, () => {
        console.log(`[serverless-adapter] Online su porta ${config.port}`);
      });

      const shutdown = (signal) => {
        console.log(`[serverless-adapter] ${signal} ricevuto, chiusura...`);
        server.close(() => process.exit(0));
      };

      process.on("SIGTERM", () => shutdown("SIGTERM"));
      process.on("SIGINT", () => shutdown("SIGINT"));
    } catch (err) {
      console.error("[serverless-adapter] Avvio fallito:", err.message);
      process.exit(1);
    }
  })();
}

// Handler serverless: garantisce connessione/seed prima di delegare a Express.
module.exports = async (req, res) => {
  await connect();
  await seedMenu();
  return app(req, res);
};
