import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";

import { canAccess, getRequestAuth, requirePermission } from "../auth.js";
import { prisma } from "../database.js";
import { publicBusinessParamsSchema } from "./config.js";
import { createInquiryRateLimiter } from "./inquiry-guard.js";
import { businessParamsSchema } from "./mvp-schemas.js";
import {
  buildPickupSlots,
  canTransitionPickupOrderStatus,
  pickupOrderStatuses,
  type PickupOrderStatus,
  weekdayForDate,
  zonedDateTimeToUtc,
} from "./pickup-ordering.js";
import { parsePayload } from "./utils.js";

const datePattern = /^\d{4}-\d{2}-\d{2}$/u;
const timePattern = /^\d{2}:\d{2}$/u;
const activeCapacityStatuses: PickupOrderStatus[] = ["new", "accepted", "preparing", "ready"];

const noHtmlText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !/<[^>]*>/u.test(value), "HTML is not accepted.");

const availabilityQuerySchema = z.object({ date: z.string().regex(datePattern) });
export const publicOrderSchema = z
  .object({
    name: noHtmlText(120).min(2),
    email: z.string().trim().email().max(200),
    phone: z.union([noHtmlText(60), z.null()]).optional(),
    notes: z.union([noHtmlText(1_000), z.literal("")]).optional(),
    pickupDate: z.string().regex(datePattern),
    pickupTime: z.string().regex(timePattern),
    privacyAccepted: z.literal(true),
    company: z.union([noHtmlText(120), z.literal("")]).optional(),
    items: z
      .array(
        z.object({
          serviceId: z.string().trim().min(1).max(100),
          quantity: z.number().int().min(1).max(20),
        }),
      )
      .min(1)
      .max(20),
  })
  .superRefine((value, context) => {
    const ids = value.items.map((item) => item.serviceId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", path: ["items"], message: "Items must be unique." });
    }
  });

const orderingSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  pickupLeadMinutes: z.number().int().min(0).max(720).optional(),
  slotMinutes: z.number().int().min(5).max(120).optional(),
  slotCapacity: z.number().int().min(1).max(100).optional(),
  minimumOrderCents: z.number().int().min(0).max(1_000_000).optional(),
});

const orderListQuerySchema = z.object({
  status: z.enum(pickupOrderStatuses).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const orderParamsSchema = businessParamsSchema.extend({ orderId: z.string().trim().min(1) });
const updateOrderStatusSchema = z.object({ status: z.enum(pickupOrderStatuses) });

type OrderingBusiness = {
  id: string;
  cityId: string;
  timezone: string;
  currency: string;
  orderingSettings: {
    enabled: boolean;
    pickupLeadMinutes: number;
    slotMinutes: number;
    slotCapacity: number;
    minimumOrderCents: number;
  } | null;
  openingDays: Array<{
    weekday: number;
    isClosed: boolean;
    intervals: Array<{ opensAt: string; closesAt: string }>;
  }>;
};

class PickupSlotUnavailableError extends Error {}

async function findPublicOrderingBusiness(citySlug: string, businessSlug: string) {
  return prisma.business.findFirst({
    where: {
      slug: businessSlug,
      status: "active",
      city: { slug: citySlug, active: true, status: "active" },
    },
    select: {
      id: true,
      cityId: true,
      timezone: true,
      currency: true,
      orderingSettings: {
        select: {
          enabled: true,
          pickupLeadMinutes: true,
          slotMinutes: true,
          slotCapacity: true,
          minimumOrderCents: true,
        },
      },
      openingDays: {
        orderBy: { weekday: "asc" },
        select: {
          weekday: true,
          isClosed: true,
          intervals: { orderBy: { sortOrder: "asc" }, select: { opensAt: true, closesAt: true } },
        },
      },
    },
  });
}

function orderingIsEnabled(business: OrderingBusiness | null): business is OrderingBusiness & {
  orderingSettings: NonNullable<OrderingBusiness["orderingSettings"]>;
} {
  return Boolean(business?.orderingSettings?.enabled);
}

async function reservationCounts(businessId: string, date: string, timeZone: string) {
  const start = zonedDateTimeToUtc(date, "00:00", timeZone);
  const tomorrow = new Date(`${date}T12:00:00.000Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const nextDate = tomorrow.toISOString().slice(0, 10);
  const end = zonedDateTimeToUtc(nextDate, "00:00", timeZone);
  if (!start || !end) return new Map<number, number>();
  const orders = await prisma.pickupOrder.findMany({
    where: {
      businessId,
      pickupAt: { gte: start, lt: end },
      status: { in: activeCapacityStatuses },
    },
    select: { pickupAt: true },
  });
  const counts = new Map<number, number>();
  for (const order of orders) {
    counts.set(order.pickupAt.getTime(), (counts.get(order.pickupAt.getTime()) ?? 0) + 1);
  }
  return counts;
}

async function buildAvailability(business: OrderingBusiness, date: string, now = new Date()) {
  const settings = business.orderingSettings;
  if (!settings) return [];
  const reservations = await reservationCounts(business.id, date, business.timezone);
  return buildPickupSlots({
    date,
    timeZone: business.timezone,
    openingDays: business.openingDays,
    slotMinutes: settings.slotMinutes,
    pickupLeadMinutes: settings.pickupLeadMinutes,
    slotCapacity: settings.slotCapacity,
    reservations,
    now,
  });
}

async function findAccessibleBusiness(
  citySlug: string,
  businessSlug: string,
  request: FastifyRequest,
  permission: "businesses.read" | "businesses.manage" | "settings.manage",
) {
  const business = await prisma.business.findFirst({
    where: { slug: businessSlug, city: { slug: citySlug } },
    select: { id: true, cityId: true },
  });
  const auth = getRequestAuth(request);
  if (
    !business ||
    !canAccess(auth.activeAccess, permission, {
      scopeType: "business",
      cityId: business.cityId,
      businessId: business.id,
    })
  )
    return null;
  return business;
}

function mapOrder(order: {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  notes: string | null;
  pickupAt: Date;
  status: PickupOrderStatus;
  totalCents: number;
  createdAt: Date;
  updatedAt: Date;
  items?: Array<{
    id: string;
    nameSnapshot: string;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
  }>;
}) {
  return order;
}

export function registerPickupOrderingRoutes(app: FastifyInstance) {
  const orderRateLimiter = createInquiryRateLimiter(8, 10 * 60 * 1_000);

  app.get(
    "/api/v2/public/cities/:citySlug/businesses/:businessSlug/orders/menu",
    async (request, reply) => {
      const params = parsePayload(publicBusinessParamsSchema, request.params);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      const business = await findPublicOrderingBusiness(
        params.data.citySlug,
        params.data.businessSlug,
      );
      if (!orderingIsEnabled(business))
        return reply.code(404).send({ status: "error", error: "Pickup ordering is not available" });
      const items = await prisma.businessService.findMany({
        where: {
          businessId: business.id,
          status: "published",
          priceCents: { not: null },
          pickupEnabled: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          shortDescription: true,
          description: true,
          priceCents: true,
        },
      });
      return {
        status: "ok",
        currency: business.currency,
        timezone: business.timezone,
        minimumOrderCents: business.orderingSettings.minimumOrderCents,
        items: items.map((item) => ({ ...item, priceCents: item.priceCents ?? 0 })),
      };
    },
  );

  app.get(
    "/api/v2/public/cities/:citySlug/businesses/:businessSlug/orders/availability",
    async (request, reply) => {
      const params = parsePayload(publicBusinessParamsSchema, request.params);
      const query = parsePayload(availabilityQuerySchema, request.query);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      if (!query.success) return reply.code(query.response.statusCode).send(query.response.body);
      const business = await findPublicOrderingBusiness(
        params.data.citySlug,
        params.data.businessSlug,
      );
      if (!orderingIsEnabled(business))
        return reply.code(404).send({ status: "error", error: "Pickup ordering is not available" });
      const slots = await buildAvailability(business, query.data.date);
      return {
        status: "ok",
        date: query.data.date,
        timezone: business.timezone,
        items: slots.map((slot) => ({ id: slot.id, time: slot.time, available: slot.available })),
      };
    },
  );

  app.post(
    "/api/v2/public/cities/:citySlug/businesses/:businessSlug/orders",
    async (request, reply) => {
      const params = parsePayload(publicBusinessParamsSchema, request.params);
      const body = parsePayload(publicOrderSchema, request.body);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      if (!body.success) return reply.code(body.response.statusCode).send(body.response.body);
      if (body.data.company) return reply.code(202).send({ status: "ok" });
      if (!orderRateLimiter.allows(request.ip))
        return reply
          .code(429)
          .send({ status: "error", error: "Too many pickup orders. Try again later." });
      const business = await findPublicOrderingBusiness(
        params.data.citySlug,
        params.data.businessSlug,
      );
      if (!orderingIsEnabled(business))
        return reply.code(404).send({ status: "error", error: "Pickup ordering is not available" });
      const requestedWeekday = weekdayForDate(body.data.pickupDate);
      if (requestedWeekday === null)
        return reply.code(400).send({ status: "error", error: "Invalid pickup date" });
      const slots = await buildAvailability(business, body.data.pickupDate);
      const selectedSlot = slots.find((slot) => slot.time === body.data.pickupTime);
      if (!selectedSlot || !selectedSlot.available)
        return reply
          .code(409)
          .send({ status: "error", error: "The selected pickup slot is no longer available" });
      const services = await prisma.businessService.findMany({
        where: {
          businessId: business.id,
          id: { in: body.data.items.map((item) => item.serviceId) },
          status: "published",
          priceCents: { not: null },
          pickupEnabled: true,
        },
        select: { id: true, name: true, priceCents: true },
      });
      if (services.length !== body.data.items.length)
        return reply
          .code(400)
          .send({ status: "error", error: "One or more menu items are unavailable" });
      const serviceById = new Map(services.map((service) => [service.id, service]));
      const items = body.data.items.map((item) => {
        const service = serviceById.get(item.serviceId);
        if (!service || service.priceCents === null)
          throw new Error("Menu item unexpectedly missing");
        return {
          serviceId: service.id,
          nameSnapshot: service.name,
          unitPriceCents: service.priceCents,
          quantity: item.quantity,
          lineTotalCents: service.priceCents * item.quantity,
        };
      });
      const totalCents = items.reduce((total, item) => total + item.lineTotalCents, 0);
      if (totalCents < business.orderingSettings.minimumOrderCents)
        return reply
          .code(400)
          .send({ status: "error", error: "The minimum order amount has not been reached" });

      let order;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          order = await prisma.$transaction(
            async (transaction) => {
              const reservedCount = await transaction.pickupOrder.count({
                where: {
                  businessId: business.id,
                  pickupAt: selectedSlot.pickupAt,
                  status: { in: activeCapacityStatuses },
                },
              });
              if (reservedCount >= business.orderingSettings.slotCapacity)
                throw new PickupSlotUnavailableError();
              return transaction.pickupOrder.create({
                data: {
                  businessId: business.id,
                  reference: `CC-${randomUUID().replace(/-/gu, "").slice(0, 10).toUpperCase()}`,
                  customerName: body.data.name,
                  customerEmail: body.data.email,
                  customerPhone: body.data.phone ?? null,
                  notes: body.data.notes?.trim() || null,
                  pickupAt: selectedSlot.pickupAt,
                  totalCents,
                  privacyAccepted: true,
                  items: { create: items },
                },
                include: { items: true },
              });
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
          );
          break;
        } catch (error) {
          if (error instanceof PickupSlotUnavailableError)
            return reply
              .code(409)
              .send({ status: "error", error: "The selected pickup slot is no longer available" });
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
            continue;
          throw error;
        }
      }
      if (!order)
        return reply
          .code(409)
          .send({ status: "error", error: "The selected pickup slot is no longer available" });
      return reply.code(201).send({
        status: "ok",
        item: {
          reference: order.reference,
          pickupAt: order.pickupAt,
          totalCents: order.totalCents,
          currency: business.currency,
        },
      });
    },
  );

  app.get(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/pickup-ordering",
    { preHandler: requirePermission("businesses.read") },
    async (request, reply) => {
      const params = parsePayload(businessParamsSchema, request.params);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      const business = await findAccessibleBusiness(
        params.data.citySlug,
        params.data.businessSlug,
        request,
        "businesses.read",
      );
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      const settings = await prisma.businessOrderingSettings.findUnique({
        where: { businessId: business.id },
      });
      return { status: "ok", item: settings };
    },
  );

  app.put(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/pickup-ordering",
    { preHandler: requirePermission("settings.manage") },
    async (request, reply) => {
      const params = parsePayload(businessParamsSchema, request.params);
      const body = parsePayload(orderingSettingsSchema, request.body);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      if (!body.success) return reply.code(body.response.statusCode).send(body.response.body);
      const business = await findAccessibleBusiness(
        params.data.citySlug,
        params.data.businessSlug,
        request,
        "settings.manage",
      );
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      const item = await prisma.businessOrderingSettings.upsert({
        where: { businessId: business.id },
        create: { businessId: business.id, ...body.data },
        update: body.data,
      });
      return { status: "ok", item };
    },
  );

  app.get(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/pickup-orders",
    { preHandler: requirePermission("businesses.manage") },
    async (request, reply) => {
      const params = parsePayload(businessParamsSchema, request.params);
      const query = parsePayload(orderListQuerySchema, request.query);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      if (!query.success) return reply.code(query.response.statusCode).send(query.response.body);
      const business = await findAccessibleBusiness(
        params.data.citySlug,
        params.data.businessSlug,
        request,
        "businesses.manage",
      );
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      const where = { businessId: business.id, status: query.data.status };
      const [items, total] = await prisma.$transaction([
        prisma.pickupOrder.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (query.data.page - 1) * query.data.limit,
          take: query.data.limit,
          include: { items: { orderBy: { createdAt: "asc" } } },
        }),
        prisma.pickupOrder.count({ where }),
      ]);
      return {
        status: "ok",
        items: items.map(mapOrder),
        page: query.data.page,
        limit: query.data.limit,
        total,
      };
    },
  );

  app.patch(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/pickup-orders/:orderId",
    { preHandler: requirePermission("businesses.manage") },
    async (request, reply) => {
      const params = parsePayload(orderParamsSchema, request.params);
      const body = parsePayload(updateOrderStatusSchema, request.body);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      if (!body.success) return reply.code(body.response.statusCode).send(body.response.body);
      const business = await findAccessibleBusiness(
        params.data.citySlug,
        params.data.businessSlug,
        request,
        "businesses.manage",
      );
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      const existing = await prisma.pickupOrder.findFirst({
        where: { id: params.data.orderId, businessId: business.id },
      });
      if (!existing) return reply.code(404).send({ status: "error", error: "Order not found" });
      if (!canTransitionPickupOrderStatus(existing.status, body.data.status))
        return reply.code(409).send({ status: "error", error: "Invalid order status transition" });
      const item = await prisma.$transaction(async (transaction) => {
        const updated = await transaction.pickupOrder.update({
          where: { id: existing.id },
          data: { status: body.data.status },
          include: { items: { orderBy: { createdAt: "asc" } } },
        });
        const auth = getRequestAuth(request);
        await transaction.auditLog.create({
          data: {
            actorUserId: auth.user.id,
            action: "pickup_order.status_updated",
            targetType: "pickup_order",
            targetId: existing.id,
            scopeType: "business",
            cityId: business.cityId,
            businessId: business.id,
            metadataJson: { previousStatus: existing.status, nextStatus: body.data.status },
          },
        });
        return updated;
      });
      return { status: "ok", item: mapOrder(item) };
    },
  );
}
