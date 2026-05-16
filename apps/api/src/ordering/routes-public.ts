import type { FastifyInstance } from "fastify";
import { prisma } from "../database.js";
import {
  availabilityQuerySchema,
  businessParamsSchema,
  createOrderSchema,
  customerLookupQuerySchema,
  orderParamsSchema,
} from "./config.js";
import { buildAvailability, getOrderingSettings } from "./availability.js";
import { findBusinessForOrdering, hasOrderingEnabled } from "./business.js";
import { createPublicOrder } from "./order-service.js";
import {
  mapCustomerProfile,
  mapMenuCategory,
  mapOrder,
  normalizePhone,
  parsePayload,
} from "./shared.js";

export function registerOrderingPublicRoutes(app: FastifyInstance) {
  app.get("/api/v2/ordering/public/:citySlug/:businessSlug/menu", async (request, reply) => {
    const parsed = parsePayload(businessParamsSchema, request.params);

    if (!parsed.success) {
      return reply.code(parsed.response.statusCode).send(parsed.response.body);
    }

    const business = await findBusinessForOrdering(parsed.data.citySlug, parsed.data.businessSlug);

    if (
      !business ||
      business.status !== "active" ||
      !business.city.active ||
      business.city.status === "disabled"
    ) {
      return reply.code(404).send({
        status: "error",
        error: "Business not found",
      });
    }

    if (!hasOrderingEnabled(business)) {
      return reply.code(404).send({
        status: "error",
        error: "Ordering is not enabled for this business",
      });
    }

    const orderingSettings = getOrderingSettings(business);

    const categories = await prisma.menuCategory.findMany({
      where: {
        businessId: business.id,
        active: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        items: {
          where: {
            available: true,
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
    });

    return reply.send({
      status: "ok",
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        publicTitle: business.publicTitle,
        publicSubtitle: business.publicSubtitle,
        publicDescription: business.publicDescription,
        city: business.city,
        template: business.template,
      },
      settings: orderingSettings,
      categories: categories.map(mapMenuCategory),
    });
  });

  app.get(
    "/api/v2/ordering/public/:citySlug/:businessSlug/customers/lookup",
    async (request, reply) => {
      const paramsParsed = parsePayload(businessParamsSchema, request.params);
      const queryParsed = parsePayload(customerLookupQuerySchema, request.query);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
      }

      if (!queryParsed.success) {
        return reply.code(queryParsed.response.statusCode).send(queryParsed.response.body);
      }

      const phone = normalizePhone(queryParsed.data.phone);

      if (!phone || phone.length < 6) {
        return reply.code(400).send({
          status: "error",
          error: "Valid phone number required",
        });
      }

      const business = await findBusinessForOrdering(
        paramsParsed.data.citySlug,
        paramsParsed.data.businessSlug,
      );

      if (!business || !hasOrderingEnabled(business)) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      const customer = await prisma.customerProfile.findFirst({
        where: {
          businessId: business.id,
          phone,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          points: true,
          totalOrders: true,
          completedOrders: true,
          lastOrderAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const lastOrder = await prisma.order.findFirst({
        where: {
          businessId: business.id,
          customerPhone: phone,
          status: {
            not: "cancelled",
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          items: true,
        },
      });

      if (!customer) {
        return reply.send({
          status: "ok",
          found: false,
        });
      }

      return reply.send({
        status: "ok",
        found: true,
        customer: mapCustomerProfile(customer),
        lastOrder: lastOrder ? mapOrder(lastOrder) : null,
      });
    },
  );

  app.get(
    "/api/v2/ordering/public/:citySlug/:businessSlug/availability",
    async (request, reply) => {
      const paramsParsed = parsePayload(businessParamsSchema, request.params);
      const queryParsed = parsePayload(availabilityQuerySchema, request.query);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
      }

      if (!queryParsed.success) {
        return reply.code(queryParsed.response.statusCode).send(queryParsed.response.body);
      }

      const business = await findBusinessForOrdering(
        paramsParsed.data.citySlug,
        paramsParsed.data.businessSlug,
      );

      if (
        !business ||
        business.status !== "active" ||
        !business.city.active ||
        business.city.status === "disabled"
      ) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (!hasOrderingEnabled(business)) {
        return reply.code(404).send({
          status: "error",
          error: "Ordering is not enabled for this business",
        });
      }

      return reply.send({
        status: "ok",
        ...(await buildAvailability(business, queryParsed.data.date)),
      });
    },
  );

  app.post("/api/v2/ordering/public/:citySlug/:businessSlug/orders", async (request, reply) => {
    const paramsParsed = parsePayload(businessParamsSchema, request.params);
    const bodyParsed = parsePayload(createOrderSchema, request.body);

    if (!paramsParsed.success) {
      return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
    }

    if (!bodyParsed.success) {
      return reply.code(bodyParsed.response.statusCode).send(bodyParsed.response.body);
    }

    const business = await findBusinessForOrdering(
      paramsParsed.data.citySlug,
      paramsParsed.data.businessSlug,
    );

    if (
      !business ||
      business.status !== "active" ||
      !business.city.active ||
      business.city.status === "disabled"
    ) {
      return reply.code(404).send({
        status: "error",
        error: "Business not found",
      });
    }

    if (!hasOrderingEnabled(business)) {
      return reply.code(404).send({
        status: "error",
        error: "Ordering is not enabled for this business",
      });
    }
    const result = await createPublicOrder({
      business,
      payload: bodyParsed.data,
    });

    if (!result.ok) {
      return reply.code(result.statusCode).send({
        status: "error",
        error: result.error,
      });
    }

    return reply.code(201).send({
      status: "ok",
      order: mapOrder(result.order),
      trackingPath: result.trackingPath,
    });
  });

  app.get(
    "/api/v2/ordering/public/:citySlug/:businessSlug/orders/:orderId",
    async (request, reply) => {
      const parsed = parsePayload(orderParamsSchema, request.params);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const business = await findBusinessForOrdering(
        parsed.data.citySlug,
        parsed.data.businessSlug,
      );

      if (!business || !hasOrderingEnabled(business)) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      const order = await prisma.order.findFirst({
        where: {
          id: parsed.data.orderId,
          businessId: business.id,
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        return reply.code(404).send({
          status: "error",
          error: "Order not found",
        });
      }

      return reply.send({
        status: "ok",
        order: mapOrder(order),
      });
    },
  );
}
