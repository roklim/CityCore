import type { FastifyInstance } from "fastify";
import { canAccess, getRequestAuth, requireAuth } from "../auth.js";
import { prisma } from "../database.js";
import {
  DEFAULT_MAX_ORDERS_PER_SLOT,
  DEFAULT_MIN_PREPARATION_MINUTES,
  DEFAULT_SLOT_MINUTES,
  businessParamsSchema,
  orderingSettingsSchema,
} from "./config.js";
import { getOrderingSettings } from "./availability.js";
import { findBusinessForOrdering } from "./business.js";
import { parsePayload } from "./shared.js";

export function registerOrderingSettingsRoutes(app: FastifyInstance) {
  app.get(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/settings",
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

      return reply.send({
        status: "ok",
        settings: getOrderingSettings(business),
      });
    },
  );

  app.put(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/settings",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(businessParamsSchema, request.params);
      const bodyParsed = parsePayload(orderingSettingsSchema, request.body);

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

      const settings = {
        openingHours: bodyParsed.data.openingHours ?? null,
        openingDays: bodyParsed.data.openingDays ?? [],
        openingTimeStart: bodyParsed.data.openingTimeStart ?? null,
        openingTimeEnd: bodyParsed.data.openingTimeEnd ?? null,
        deliveryCost: bodyParsed.data.deliveryCost ?? 0,
        minimumOrder: bodyParsed.data.minimumOrder ?? 0,
        slotMinutes: bodyParsed.data.slotMinutes ?? DEFAULT_SLOT_MINUTES,
        maxOrdersPerSlot: bodyParsed.data.maxOrdersPerSlot ?? DEFAULT_MAX_ORDERS_PER_SLOT,
        minPreparationMinutes:
          bodyParsed.data.minPreparationMinutes ?? DEFAULT_MIN_PREPARATION_MINUTES,
        closedDates: Array.from(new Set(bodyParsed.data.closedDates ?? [])),
        specialDates: Array.from(
          new Map(
            (bodyParsed.data.specialDates ?? []).map((entry) => [entry.date, entry]),
          ).values(),
        ),
        serviceZones: bodyParsed.data.serviceZones ?? [],
        customerMessage: bodyParsed.data.customerMessage ?? null,
      };

      if (
        settings.openingTimeStart &&
        settings.openingTimeEnd &&
        settings.openingTimeStart >= settings.openingTimeEnd
      ) {
        return reply.code(400).send({
          status: "error",
          error: "Closing time must be after opening time",
        });
      }

      for (const entry of settings.specialDates) {
        if (
          entry.openingTimeStart &&
          entry.openingTimeEnd &&
          entry.openingTimeStart >= entry.openingTimeEnd
        ) {
          return reply.code(400).send({
            status: "error",
            error: `Special date ${entry.date} has invalid opening and closing times`,
          });
        }
      }

      const module = await prisma.businessModule.findFirst({
        where: {
          businessId: business.id,
          moduleCode: "ordering",
        },
        select: {
          id: true,
        },
      });

      await prisma.$transaction(async (tx) => {
        if (module) {
          await tx.businessModule.update({
            where: {
              id: module.id,
            },
            data: {
              settingsJson: settings,
              active: true,
            },
          });
        } else {
          await tx.businessModule.create({
            data: {
              businessId: business.id,
              moduleCode: "ordering",
              active: true,
              settingsJson: settings,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorUserId: auth.user.id,
            action: "ordering.settings.updated",
            targetType: "business_module",
            targetId: module?.id ?? null,
            scopeType: "business",
            cityId: business.city.id,
            businessId: business.id,
            metadataJson: settings,
          },
        });
      });

      return reply.send({
        status: "ok",
        settings,
      });
    },
  );
}
