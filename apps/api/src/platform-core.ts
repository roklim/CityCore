import type { FastifyInstance } from "fastify";
import { registerPlatformLookupRoutes } from "./platform-core/routes-lookups.js";
import { registerPlatformCoreRouteGroup } from "./platform-core/routes.js";

export function registerPlatformCoreRoutes(app: FastifyInstance) {
  registerPlatformCoreRouteGroup(app);
  registerPlatformLookupRoutes(app);
}
