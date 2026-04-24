import { env } from "./config.js";

const workerServiceName = "platform-v2-worker";
const releaseLabel = "foundation";

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
