import { env } from "./config.js";

const banner = [
  `${env.WORKER_NAME} online.`,
  "Qui entreranno AI onboarding, email, media processing, reminder e task async.",
  `Environment: ${env.NODE_ENV}.`,
].join(" ");

console.log(banner);
