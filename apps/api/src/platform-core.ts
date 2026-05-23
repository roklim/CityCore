import type { FastifyInstance } from "fastify";
import { registerPlatformCoreRouteGroup } from "./platform-core/routes.js";

export function registerPlatformCoreRoutes(app: FastifyInstance) {
  registerPlatformCoreRouteGroup(app);
}
