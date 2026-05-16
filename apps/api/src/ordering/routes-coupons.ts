import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { canAccess, getRequestAuth, requireAuth } from "../auth.js";
import { prisma } from "../database.js";
import {
  businessParamsSchema,
  couponListQuerySchema,
  couponParamsSchema,
  createCouponSchema,
  updateCouponSchema,
} from "./config.js";
import { findBusinessForOrdering } from "./business.js";
import { decimalToNumber, isPrismaError, mapCoupon, parsePayload } from "./shared.js";

export function registerOrderingCouponRoutes(app: FastifyInstance) {
  app.get(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/coupons",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(businessParamsSchema, request.params);
      const queryParsed = parsePayload(couponListQuerySchema, request.query);

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
        !canAccess(auth.activeAccess, "settings.manage", {
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

      const coupons = await prisma.coupon.findMany({
        where: {
          businessId: business.id,
          active: queryParsed.data.active,
        },
        orderBy: [{ createdAt: "desc" }],
        take: queryParsed.data.limit,
      });

      return reply.send({
        status: "ok",
        items: coupons.map(mapCoupon),
      });
    },
  );

  app.post(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/coupons",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(businessParamsSchema, request.params);
      const bodyParsed = parsePayload(createCouponSchema, request.body);

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
        !canAccess(auth.activeAccess, "settings.manage", {
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

      try {
        const coupon = await prisma.$transaction(async (tx) => {
          const createdCoupon = await tx.coupon.create({
            data: {
              businessId: business.id,
              code: bodyParsed.data.code.trim().toUpperCase(),
              type: bodyParsed.data.type,
              value: new Prisma.Decimal(bodyParsed.data.value),
              expiresAt: bodyParsed.data.expiresAt ? new Date(bodyParsed.data.expiresAt) : null,
              usageLimit: bodyParsed.data.usageLimit,
              active: bodyParsed.data.active,
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: auth.user.id,
              action: "ordering.coupon.created",
              targetType: "coupon",
              targetId: createdCoupon.id,
              scopeType: "business",
              cityId: business.city.id,
              businessId: business.id,
              metadataJson: {
                code: createdCoupon.code,
                type: createdCoupon.type,
              },
            },
          });

          return createdCoupon;
        });

        return reply.code(201).send({
          status: "ok",
          item: mapCoupon(coupon),
        });
      } catch (error) {
        if (isPrismaError(error, "P2002")) {
          return reply.code(409).send({
            status: "error",
            error: "Coupon code already exists for this business",
          });
        }

        throw error;
      }
    },
  );

  app.patch(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/coupons/:couponId",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(couponParamsSchema, request.params);
      const bodyParsed = parsePayload(updateCouponSchema, request.body);

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
        !canAccess(auth.activeAccess, "settings.manage", {
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

      const existingCoupon = await prisma.coupon.findFirst({
        where: {
          id: paramsParsed.data.couponId,
          businessId: business.id,
        },
        select: {
          id: true,
          code: true,
          type: true,
          value: true,
          expiresAt: true,
          usageLimit: true,
          active: true,
        },
      });

      if (!existingCoupon) {
        return reply.code(404).send({
          status: "error",
          error: "Coupon not found",
        });
      }

      try {
        const coupon = await prisma.$transaction(async (tx) => {
          const updatedCoupon = await tx.coupon.update({
            where: {
              id: existingCoupon.id,
            },
            data: {
              code: bodyParsed.data.code?.trim().toUpperCase(),
              type: bodyParsed.data.type,
              value:
                bodyParsed.data.value != null
                  ? new Prisma.Decimal(bodyParsed.data.value)
                  : undefined,
              expiresAt:
                bodyParsed.data.expiresAt === null
                  ? null
                  : bodyParsed.data.expiresAt
                    ? new Date(bodyParsed.data.expiresAt)
                    : undefined,
              usageLimit: bodyParsed.data.usageLimit,
              active: bodyParsed.data.active,
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: auth.user.id,
              action: "ordering.coupon.updated",
              targetType: "coupon",
              targetId: updatedCoupon.id,
              scopeType: "business",
              cityId: business.city.id,
              businessId: business.id,
              metadataJson: {
                from: {
                  code: existingCoupon.code,
                  type: existingCoupon.type,
                  value: decimalToNumber(existingCoupon.value),
                  expiresAt: existingCoupon.expiresAt,
                  usageLimit: existingCoupon.usageLimit,
                  active: existingCoupon.active,
                },
                to: {
                  code: updatedCoupon.code,
                  type: updatedCoupon.type,
                  value: decimalToNumber(updatedCoupon.value),
                  expiresAt: updatedCoupon.expiresAt,
                  usageLimit: updatedCoupon.usageLimit,
                  active: updatedCoupon.active,
                },
              },
            },
          });

          return updatedCoupon;
        });

        return reply.send({
          status: "ok",
          item: mapCoupon(coupon),
        });
      } catch (error) {
        if (isPrismaError(error, "P2002")) {
          return reply.code(409).send({
            status: "error",
            error: "Coupon code already exists for this business",
          });
        }

        throw error;
      }
    },
  );

  app.delete(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/coupons/:couponId",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = parsePayload(couponParamsSchema, request.params);

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
        !canAccess(auth.activeAccess, "settings.manage", {
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

      const coupon = await prisma.coupon.findFirst({
        where: {
          id: parsed.data.couponId,
          businessId: business.id,
        },
        select: {
          id: true,
          code: true,
        },
      });

      if (!coupon) {
        return reply.code(404).send({
          status: "error",
          error: "Coupon not found",
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.order.updateMany({
          where: {
            couponId: coupon.id,
          },
          data: {
            couponId: null,
          },
        });

        await tx.coupon.delete({
          where: {
            id: coupon.id,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: auth.user.id,
            action: "ordering.coupon.deleted",
            targetType: "coupon",
            targetId: coupon.id,
            scopeType: "business",
            cityId: business.city.id,
            businessId: business.id,
            metadataJson: {
              code: coupon.code,
            },
          },
        });
      });

      return reply.send({
        status: "ok",
      });
    },
  );
}
