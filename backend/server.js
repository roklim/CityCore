// server.js
// Entry point — avvio backend Pizzeria (Render-ready)

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const config = require("./config");
const { connect, seedMenu } = require("./db");
const { errorHandler } = require("./middleware/errorHandler");

const authRouter = require("./routes/auth");
const ordersRouter = require("./routes/orders");
const menuRouter = require("./routes/menu");

const app = express();

// ─────────────────────────────────────────────
// SECURITY
// ─────────────────────────────────────────────

app.use(helmet());

app.use(
  cors({
    origin: config.cors.origin || "*",
    credentials: true,
  }),
);

// Rate limit (anti spam / brute force)
app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs || 15 * 60 * 1000,
    max: config.rateLimit.max || 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Troppe richieste, riprova più tardi." },
  }),
);

// ─────────────────────────────────────────────
// MIDDLEWARE BASE
// ─────────────────────────────────────────────

app.use(express.json({ limit: "100kb" }));

app.use(
  morgan(config.isProd ? "combined" : "dev", {
    skip: (req) => req.url === "/health",
  }),
);

// ─────────────────────────────────────────────
// HEALTH CHECK (Render friendly)
// ─────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.status(200).json({
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
app.use("/api/orders", ordersRouter);
app.use("/api/menu", menuRouter);

// ─────────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────────

app.use(errorHandler);

// ─────────────────────────────────────────────
// ERROR HANDLER CENTRALIZZATO
// ─────────────────────────────────────────────

app.use(errorHandler);

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────

async function start() {
  try {
    console.log("[server] Avvio backend...");

    await connect();
    console.log("[db] Connessione completata");

    await seedMenu();
    console.log("[db] Seed menu verificato");

    const server = app.listen(config.port, () => {
      console.log(
        `[server] 🚀 Online su porta ${config.port} (${config.nodeEnv})`,
      );
    });

    // ─────────────────────────────────────────────
    // Graceful shutdown (IMPORTANTISSIMO su Render)
    // ─────────────────────────────────────────────

    process.on("SIGTERM", () => {
      console.log("[server] SIGTERM ricevuto, chiusura server...");
      server.close(() => {
        console.log("[server] Server chiuso correttamente");
        process.exit(0);
      });
    });

    process.on("uncaughtException", (err) => {
      console.error("[server] Uncaught Exception:", err);
    });

    process.on("unhandledRejection", (err) => {
      console.error("[server] Unhandled Rejection:", err);
    });
  } catch (err) {
    console.error("[server] ❌ Avvio fallito:", err.message);
    process.exit(1);
  }
}

start();
