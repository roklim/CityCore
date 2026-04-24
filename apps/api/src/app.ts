import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";
import { env } from "./config.js";

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
    service: "platform-api-v2",
    time: new Date().toISOString(),
    env: env.NODE_ENV,
  }));

  app.get("/api/v2", async () => ({
    status: "ok",
    area: "platform-core",
    message:
      "Foundation API V2 online. Qui cresceranno auth, cities, businesses, templates e modules.",
  }));

  return app;
}
