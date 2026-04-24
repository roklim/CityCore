import { buildApp } from "./app.js";
import { env } from "./config.js";

async function start() {
  const app = buildApp();
  const bootContext = {
    event: "boot.start",
    service: "platform-api-v2",
    env: env.NODE_ENV,
    port: env.PORT,
    pid: process.pid,
    dependencies: {
      databaseConfigured: Boolean(env.DATABASE_URL),
      redisConfigured: Boolean(env.REDIS_URL),
      authConfigured: Boolean(env.AUTH_SECRET),
    },
  };

  try {
    app.log.info(bootContext, "platform-api booting");

    const address = await app.listen({
      host: "0.0.0.0",
      port: env.PORT,
    });

    app.log.info(
      {
        ...bootContext,
        event: "boot.ready",
        address,
      },
      "platform-api ready",
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
