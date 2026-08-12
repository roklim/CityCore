import net from "node:net";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";
import { registerAuthRoutes } from "./auth-routes.js";
import { env } from "./config.js";
import { prisma } from "./database.js";
import { registerPlatformCoreRoutes } from "./platform-core.js";

const bootedAt = new Date().toISOString();
const apiServiceName = "citycore-api";
const releaseLabel = "core";
const dependencyTimeoutMs = 1_500;

type DependencyCheck = {
  configured: boolean;
  status: "ok" | "error";
  latencyMs?: number;
  error?: string;
};

function formatHealthError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown dependency error";
}

async function checkDatabase(): Promise<DependencyCheck> {
  const startedAt = Date.now();

  if (!env.DATABASE_URL) {
    return {
      configured: false,
      status: "error",
      error: "DATABASE_URL is not configured",
    };
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    return {
      configured: true,
      status: "ok",
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      configured: true,
      status: "error",
      latencyMs: Date.now() - startedAt,
      error: formatHealthError(error),
    };
  }
}

async function checkRedis(): Promise<DependencyCheck> {
  const startedAt = Date.now();

  if (!env.REDIS_URL) {
    return {
      configured: false,
      status: "error",
      error: "REDIS_URL is not configured",
    };
  }

  try {
    const url = new URL(env.REDIS_URL);
    const port = url.port ? Number(url.port) : 6379;
    const host = url.hostname || "localhost";

    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ host, port });
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Redis health check timed out after ${dependencyTimeoutMs}ms`));
      }, dependencyTimeoutMs);

      socket.once("connect", () => {
        socket.write("*1\r\n$4\r\nPING\r\n");
      });

      socket.once("data", (data) => {
        clearTimeout(timeout);
        socket.end();

        if (data.toString().startsWith("+PONG")) {
          resolve();
          return;
        }

        reject(new Error("Redis did not return PONG"));
      });

      socket.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    return {
      configured: true,
      status: "ok",
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      configured: true,
      status: "error",
      latencyMs: Date.now() - startedAt,
      error: formatHealthError(error),
    };
  }
}

export function buildApp() {
  const configuredOrigins = new Set(
    (env.WEB_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  const app = Fastify({
    logger: env.NODE_ENV !== "test",
    trustProxy: env.TRUST_PROXY_HOPS ?? (env.NODE_ENV === "production" ? 1 : false),
  });

  void app.register(cors, {
    origin(origin, callback) {
      if (!origin || env.NODE_ENV !== "production" || configuredOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  });

  void app.register(helmet);
  registerAuthRoutes(app);
  registerPlatformCoreRoutes(app);

  app.get("/health", async (_request, reply) => {
    const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
    const auth = {
      configured: Boolean(env.AUTH_SECRET),
      status: env.AUTH_SECRET ? "ok" : "error",
    };
    const healthy = database.status === "ok" && redis.status === "ok" && auth.status === "ok";

    if (!healthy) {
      reply.code(503);
    }

    return {
      status: healthy ? "ok" : "degraded",
      service: apiServiceName,
      release: releaseLabel,
      surface: "api",
      time: new Date().toISOString(),
      env: env.NODE_ENV,
      bootedAt,
      dependencies: {
        database,
        redis,
        auth,
      },
    };
  });

  app.get("/api/v2", async () => ({
    status: "ok",
    area: "platform-core",
    message:
      "CityCore core attivo. Platform, city, business, auth e surface pubbliche generiche sono servite dalla piattaforma.",
    routes: {
      health: "/health",
      publicCatalog: "/api/v2/public",
      publicCities: "/api/v2/public/cities",
      publicBusinesses: "/api/v2/public/businesses",
      authBootstrap: "/api/v2/auth/bootstrap-admin",
      authLogin: "/api/v2/auth/login",
      authMe: "/api/v2/auth/me",
      authSelectAccess: "/api/v2/auth/select-access",
      platformCore: "/api/v2/platform-core",
      templates: "/api/v2/platform-core/templates",
      cities: "/api/v2/platform-core/cities",
      businesses: "/api/v2/platform-core/businesses",
      accessGrants: "/api/v2/platform-core/access-grants",
      auditLogs: "/api/v2/platform-core/audit-logs",
    },
  }));

  return app;
}
