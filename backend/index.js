"use strict";

// ── Deps ────────────────────────────────────────────────────
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

// ── App ─────────────────────────────────────────────────────
const app = express();

// ─────────────────────────────────────────────
// SECURITY
// ─────────────────────────────────────────────

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
    message: { error: "Troppe richieste, riprova più tardi." },
  }),
);

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────

app.use(express.json({ limit: "100kb" }));

app.use(
  morgan(config.isProd ? "combined" : "dev", {
    skip: (req) => req.url === "/health",
  }),
);

// ─────────────────────────────────────────────
// HEALTH CHECK (Render + Vercel)
// ─────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "pizzeria-api",
    time: new Date().toISOString(),
    env: config.nodeEnv,
  });
});

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

app.use("/api/auth", authRouter);
app.use("/api/customers", customersRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/menu", menuRouter);

// ─────────────────────────────────────────────
// 404 + ERROR HANDLER
// ─────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint non trovato" });
});

app.use(errorHandler);

// ─────────────────────────────────────────────
// START (solo su Render / Node diretto)
// Vercel gestisce il listen da solo — non chiamare
// app.listen() quando il modulo è importato da Vercel
// ─────────────────────────────────────────────

if (require.main === module) {
  (async () => {
    try {
      console.log("[server] Avvio...");

      await connect();
      await seedMenu();

      const server = app.listen(config.port, () => {
        console.log(
          `[server] 🚀 Online su porta ${config.port} (${config.nodeEnv})`,
        );
      });

      // Graceful shutdown — fondamentale su Render
      const shutdown = (signal) => {
        console.log(`[server] ${signal} ricevuto, chiusura...`);
        server.close(() => {
          console.log("[server] Server chiuso");
          process.exit(0);
        });
      };

      process.on("SIGTERM", () => shutdown("SIGTERM"));
      process.on("SIGINT", () => shutdown("SIGINT"));

      process.on("uncaughtException", (err) =>
        console.error("[server] uncaughtException:", err),
      );
      process.on("unhandledRejection", (err) =>
        console.error("[server] unhandledRejection:", err),
      );
    } catch (err) {
      console.error("[server] ❌ Avvio fallito:", err.message);
      process.exit(1);
    }
  })();
}

// ─────────────────────────────────────────────
// EXPORT per Vercel (serverless)
// ─────────────────────────────────────────────

module.exports = async (req, res) => {
  await connect();
  await seedMenu();
  return app(req, res);
};
