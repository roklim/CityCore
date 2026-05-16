import type { FastifyInstance } from "fastify";
import { registerOrderingCouponRoutes } from "./ordering/routes-coupons.js";
import { registerOrderingCustomerRoutes } from "./ordering/routes-customers.js";
import { registerOrderingMenuRoutes } from "./ordering/routes-menu.js";
import { registerOrderingOrderRoutes } from "./ordering/routes-orders.js";
import { registerOrderingPublicRoutes } from "./ordering/routes-public.js";
import { registerOrderingSettingsRoutes } from "./ordering/routes-settings.js";

export function registerOrderingRoutes(app: FastifyInstance) {
  app.get("/api/v2/ordering", async () => ({
    status: "ok",
    milestone: "ordering-slice-3",
    capabilities: {
      publicMenu: ["/api/v2/ordering/public/:citySlug/:businessSlug/menu"],
      publicAvailability: ["/api/v2/ordering/public/:citySlug/:businessSlug/availability"],
      adminMenu: ["/api/v2/ordering/businesses/:citySlug/:businessSlug/menu"],
      publicCustomerLookup: ["/api/v2/ordering/public/:citySlug/:businessSlug/customers/lookup"],
      adminCustomers: ["/api/v2/ordering/businesses/:citySlug/:businessSlug/customers"],
      adminCoupons: ["/api/v2/ordering/businesses/:citySlug/:businessSlug/coupons"],
      adminSettings: ["/api/v2/ordering/businesses/:citySlug/:businessSlug/settings"],
    },
  }));

  registerOrderingPublicRoutes(app);
  registerOrderingMenuRoutes(app);
  registerOrderingOrderRoutes(app);
  registerOrderingCustomerRoutes(app);
  registerOrderingSettingsRoutes(app);
  registerOrderingCouponRoutes(app);
}
