import type { FastifyInstance } from "fastify";
import { canAccess, getRequestAuth, requireAuth } from "../auth.js";
import { prisma } from "../database.js";
import {
  businessParamsSchema,
  listOrdersQuerySchema,
  orderParamsSchema,
  updateOrderStatusSchema,
} from "./config.js";
import { findBusinessForOrdering } from "./business.js";
import { mapOrder, parsePayload } from "./shared.js";

export function registerOrderingOrderRoutes(app: FastifyInstance) {
  app.get(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/orders",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(businessParamsSchema, request.params);
      const queryParsed = parsePayload(listOrdersQuerySchema, request.query);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
      }

      if (!queryParsed.success) {
        return reply.code(queryParsed.response.statusCode).send(queryParsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        paramsParsed.data.citySlug,
        paramsParsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "orders.read", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const orders = await prisma.order.findMany({
        where: {
          businessId: business.id,
          status: queryParsed.data.status,
        },
        orderBy: [{ createdAt: "desc" }],
        take: queryParsed.data.limit,
        include: {
          items: true,
        },
      });

      return reply.send({
        status: "ok",
        items: orders.map(mapOrder),
      });
    },
  );

  app.get(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/orders/stats",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = parsePayload(businessParamsSchema, request.params);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        parsed.data.citySlug,
        parsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "orders.read", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const orders = await prisma.order.findMany({
        where: {
          businessId: business.id,
        },
        select: {
          status: true,
          grandTotal: true,
        },
      });

      const summary = {
        total: orders.length,
        open: 0,
        pending: 0,
        confirmed: 0,
        preparing: 0,
        ready: 0,
        completed: 0,
        cancelled: 0,
        revenue: 0,
      };

      for (const order of orders) {
        summary[order.status] += 1;

        if (["pending", "confirmed", "preparing", "ready"].includes(order.status)) {
          summary.open += 1;
        }

        if (order.status !== "cancelled") {
          summary.revenue += Number(order.grandTotal.toString());
        }
      }

      return reply.send({
        status: "ok",
        summary,
      });
    },
  );

  app.patch(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/orders/:orderId/status",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(orderParamsSchema, request.params);
      const bodyParsed = parsePayload(updateOrderStatusSchema, request.body);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
      }

      if (!bodyParsed.success) {
        return reply.code(bodyParsed.response.statusCode).send(bodyParsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        paramsParsed.data.citySlug,
        paramsParsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "orders.manage", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const existingOrder = await prisma.order.findFirst({
        where: {
          id: paramsParsed.data.orderId,
          businessId: business.id,
        },
        include: {
          items: true,
        },
      });

      if (!existingOrder) {
        return reply.code(404).send({
          status: "error",
          error: "Order not found",
        });
      }

      const order = await prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({
          where: {
            id: existingOrder.id,
          },
          data: {
            status: bodyParsed.data.status,
            handledByUserId: auth.user.id,
            loyaltyAwarded:
              bodyParsed.data.status === "completed" ? true : existingOrder.loyaltyAwarded,
          },
          include: {
            items: true,
          },
        });

        if (
          bodyParsed.data.status === "completed" &&
          existingOrder.customerProfileId &&
          !existingOrder.loyaltyAwarded
        ) {
          await tx.customerProfile.update({
            where: {
              id: existingOrder.customerProfileId,
            },
            data: {
              points: {
                increment: 1,
              },
              completedOrders: {
                increment: 1,
              },
              lastOrderAt: new Date(),
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorUserId: auth.user.id,
            action: "ordering.order.status_updated",
            targetType: "order",
            targetId: updatedOrder.id,
            scopeType: "business",
            cityId: business.city.id,
            businessId: business.id,
            metadataJson: {
              from: existingOrder.status,
              to: bodyParsed.data.status,
            },
          },
        });

        return updatedOrder;
      });

      return reply.send({
        status: "ok",
        order: mapOrder(order),
      });
    },
  );
}
