import { env } from "./config.js";

const workerServiceName = "citycore-worker";
const releaseLabel = "core";

const bootPayload = {
  event: "boot.ready",
  service: workerServiceName,
  workerName: env.WORKER_NAME,
  release: releaseLabel,
  env: env.NODE_ENV,
  pid: process.pid,
  dependencies: {
    databaseConfigured: Boolean(env.DATABASE_URL),
    redisConfigured: Boolean(env.REDIS_URL),
    authConfigured: Boolean(env.AUTH_SECRET),
  },
  time: new Date().toISOString(),
  note: "Qui entreranno AI onboarding, email, media processing, reminder e task async.",
};

console.info(JSON.stringify(bootPayload));
