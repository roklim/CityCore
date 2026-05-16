import type { FastifyInstance } from "fastify";
import { canAccess, getRequestAuth, requireAuth } from "../auth.js";
import { prisma } from "../database.js";
import { businessParamsSchema, customerLookupQuerySchema } from "./config.js";
import { findBusinessForOrdering } from "./business.js";
import { decimalToNumber, mapCustomerProfile, normalizePhone, parsePayload } from "./shared.js";

export function registerOrderingCustomerRoutes(app: FastifyInstance) {
  app.get(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/customers",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(businessParamsSchema, request.params);
      const queryParsed = parsePayload(customerLookupQuerySchema, request.query);

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
        !canAccess(auth.activeAccess, "customers.read", {
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

      const query = queryParsed.data.q?.trim() ?? "";
      const normalizedPhone = normalizePhone(queryParsed.data.phone ?? query);
      const customers = await prisma.customerProfile.findMany({
        where: {
          businessId: business.id,
          OR: query
            ? [
                {
                  name: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                ...(normalizedPhone
                  ? [
                      {
                        phone: {
                          contains: normalizedPhone,
                        },
                      },
                    ]
                  : []),
              ]
            : undefined,
        },
        orderBy: [{ lastOrderAt: "desc" }, { updatedAt: "desc" }],
        take: queryParsed.data.limit,
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

      const totals = await prisma.order.groupBy({
        by: ["customerProfileId"],
        where: {
          businessId: business.id,
          customerProfileId: {
            in: customers.map((customer) => customer.id),
          },
          status: {
            not: "cancelled",
          },
        },
        _sum: {
          grandTotal: true,
        },
      });

      const totalByCustomerId = new Map(
        totals.map((entry) => [
          entry.customerProfileId,
          decimalToNumber(entry._sum.grandTotal) ?? 0,
        ]),
      );

      return reply.send({
        status: "ok",
        items: customers.map((customer) => ({
          ...mapCustomerProfile(customer),
          totalSpent: totalByCustomerId.get(customer.id) ?? 0,
        })),
      });
    },
  );
}
