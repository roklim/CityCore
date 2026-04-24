import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";
import { env } from "./config.js";

const bootedAt = new Date().toISOString();
const apiServiceName = "platform-api-v2";
const releaseLabel = "foundation";

export function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== "test",
  });

  void app.register(cors, {
    origin: true,
  });

  void app.register(helmet);

  app.get("/health", async () => ({
    status: "ok",
    service: apiServiceName,
    release: releaseLabel,
    surface: "api",
    time: new Date().toISOString(),
    env: env.NODE_ENV,
    bootedAt,
    dependencies: {
      databaseConfigured: Boolean(env.DATABASE_URL),
      redisConfigured: Boolean(env.REDIS_URL),
      authConfigured: Boolean(env.AUTH_SECRET),
    },
  }));

  app.get("/api/v2", async () => ({
    status: "ok",
    area: "platform-core",
    message:
      "Foundation API V2 online. Qui cresceranno auth, cities, businesses, templates e modules.",
  }));

  return app;
}
