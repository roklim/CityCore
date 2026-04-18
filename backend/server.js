"use strict";

// Entry point HTTP del backend. Qui vengono montati sicurezza, middleware,
// route API e bootstrap Mongo/seed.

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

// Sicurezza HTTP di base. Helmet imposta header difensivi, CORS viene letto da
// config per supportare sia sviluppo locale sia deploy su Vercel/Render.
app.use(helmet());

app.use(
  cors({
    origin: config.cors.origin === "*" ? true : config.cors.origin,
  }),
);

// Rate limit globale: protegge login e API pubbliche da spam/brute force senza
// aggiungere un sistema anti-abuso piu' complesso.
app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs || 15 * 60 * 1000,
    max: config.rateLimit.max || 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Troppe richieste, riprova piu tardi." },
  }),
);

// Payload piccoli: l'app non carica immagini binarie dal backend, quindi 100kb
// sono sufficienti e riducono il rischio di richieste pesanti.
app.use(express.json({ limit: "100kb" }));

app.use(
  morgan(config.isProd ? "combined" : "dev", {
    skip: (req) => req.url === "/health",
  }),
);

// Health check semplice per Render/Vercel monitoring e smoke test locali.
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "pizzeria-api",
    time: new Date().toISOString(),
    env: config.nodeEnv,
  });
});

// Route order matters: auth/business/platform sono montate prima dei moduli
// operativi. Ogni router applica poi auth e tenant scope dove necessario.
app.use("/api/auth", authRouter);
app.use("/api/business", businessesRouter);
app.use("/api/platform", platformRouter);
app.use("/api/customers", customersRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/menu", menuRouter);
app.use("/api/coupons", couponsRouter);
app.use("/api/settings", settingsRouter);

// Risposta JSON uniforme per endpoint inesistenti.
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint non trovato" });
});

// Deve rimanere dopo tutte le route.
app.use(errorHandler);

async function start() {
  try {
    console.log("[server] Avvio backend...");

    await connect();
    console.log("[db] Connessione completata");

    await seedMenu();
    console.log("[db] Seed menu verificato");

    const server = app.listen(config.port, () => {
      console.log(`[server] Online su porta ${config.port} (${config.nodeEnv})`);
    });

    // Chiusura pulita richiesta da ambienti managed come Render.
    process.on("SIGTERM", () => {
      console.log("[server] SIGTERM ricevuto, chiusura server...");
      server.close(() => {
        console.log("[server] Server chiuso correttamente");
        process.exit(0);
      });
    });

    // Logghiamo errori inattesi senza duplicare la logica di risposta HTTP.
    process.on("uncaughtException", (err) => {
      console.error("[server] Uncaught Exception:", err);
    });

    process.on("unhandledRejection", (err) => {
      console.error("[server] Unhandled Rejection:", err);
    });
  } catch (err) {
    console.error("[server] Avvio fallito:", err.message);
    process.exit(1);
  }
}

start();
