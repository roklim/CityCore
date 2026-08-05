import type { FastifyInstance, FastifyRequest } from "fastify";

import { canAccess, getRequestAuth, requirePermission } from "../auth.js";
import { prisma } from "../database.js";
import {
  canTransitionInquiryStatus,
  getBusinessPublishReadiness,
  validateOpeningWeek,
} from "./mvp-domain.js";
import {
  businessParamsSchema,
  inquiryListQuerySchema,
  inquiryParamsSchema,
  replaceOpeningWeekSchema,
  serviceParamsSchema,
  serviceSchema,
  updateInquirySchema,
  updateServiceSchema,
} from "./mvp-schemas.js";
import { hasOwn, isPrismaError, parsePayload, slugify } from "./utils.js";

async function findBusiness(citySlug: string, businessSlug: string) {
  return prisma.business.findFirst({
    where: { slug: businessSlug, city: { slug: citySlug } },
    select: { id: true, cityId: true },
  });
}

async function requireBusinessAccess(
  citySlug: string,
  businessSlug: string,
  request: FastifyRequest,
  permission: "businesses.read" | "businesses.manage" | "catalog.manage" | "settings.manage",
) {
  const business = await findBusiness(citySlug, businessSlug);
  const auth = getRequestAuth(request);
  const allowed =
    business &&
    canAccess(auth.activeAccess, permission, {
      scopeType: "business",
      cityId: business.cityId,
      businessId: business.id,
    });
  return allowed ? business : null;
}

function mapService(service: {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  priceLabel: string | null;
  durationMinutes: number | null;
  status: "draft" | "in_review" | "published" | "archived";
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return service;
}

function mapInquiry(inquiry: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  privacyAccepted: boolean;
  status: "new" | "read" | "closed";
  readAt: Date | null;
  internalNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return inquiry;
}

export function registerBusinessMvpRoutes(app: FastifyInstance) {
  app.get(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/services",
    { preHandler: requirePermission("businesses.read") },
    async (request, reply) => {
      const params = parsePayload(businessParamsSchema, request.params);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      const business = await requireBusinessAccess(
        params.data.citySlug,
        params.data.businessSlug,
        request,
        "businesses.read",
      );
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      const items = await prisma.businessService.findMany({
        where: { businessId: business.id },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
      return { status: "ok", items: items.map(mapService) };
    },
  );

  app.post(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/services",
    { preHandler: requirePermission("catalog.manage") },
    async (request, reply) => {
      const params = parsePayload(businessParamsSchema, request.params);
      const body = parsePayload(serviceSchema, request.body);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      if (!body.success) return reply.code(body.response.statusCode).send(body.response.body);
      const business = await requireBusinessAccess(
        params.data.citySlug,
        params.data.businessSlug,
        request,
        "catalog.manage",
      );
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      try {
        const item = await prisma.businessService.create({
          data: {
            businessId: business.id,
            name: body.data.name,
            slug: slugify(body.data.slug ?? body.data.name),
            shortDescription: body.data.shortDescription ?? null,
            description: body.data.description ?? null,
            priceLabel: body.data.priceLabel ?? null,
            durationMinutes: body.data.durationMinutes ?? null,
            status: body.data.status,
            sortOrder: body.data.sortOrder,
          },
        });
        return reply.code(201).send({ status: "ok", item: mapService(item) });
      } catch (error) {
        if (isPrismaError(error, "P2002"))
          return reply
            .code(409)
            .send({ status: "error", error: "Service slug already exists for this business" });
        throw error;
      }
    },
  );

  app.get(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/services/:serviceId",
    { preHandler: requirePermission("businesses.read") },
    async (request, reply) => {
      const params = parsePayload(serviceParamsSchema, request.params);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      const business = await requireBusinessAccess(
        params.data.citySlug,
        params.data.businessSlug,
        request,
        "businesses.read",
      );
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      const item = await prisma.businessService.findFirst({
        where: { id: params.data.serviceId, businessId: business.id },
      });
      if (!item) return reply.code(404).send({ status: "error", error: "Service not found" });
      return { status: "ok", item: mapService(item) };
    },
  );

  app.patch(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/services/:serviceId",
    { preHandler: requirePermission("catalog.manage") },
    async (request, reply) => {
      const params = parsePayload(serviceParamsSchema, request.params);
      const body = parsePayload(updateServiceSchema, request.body);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      if (!body.success) return reply.code(body.response.statusCode).send(body.response.body);
      if (Object.keys(body.data).length === 0)
        return reply.code(400).send({ status: "error", error: "No fields to update" });
      const business = await requireBusinessAccess(
        params.data.citySlug,
        params.data.businessSlug,
        request,
        "catalog.manage",
      );
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      const existing = await prisma.businessService.findFirst({
        where: { id: params.data.serviceId, businessId: business.id },
        select: { id: true },
      });
      if (!existing) return reply.code(404).send({ status: "error", error: "Service not found" });
      try {
        const item = await prisma.businessService.update({
          where: { id: existing.id },
          data: {
            ...(hasOwn(body.data, "name") && body.data.name ? { name: body.data.name } : {}),
            ...(hasOwn(body.data, "slug") && body.data.slug
              ? { slug: slugify(body.data.slug) }
              : {}),
            ...(hasOwn(body.data, "shortDescription")
              ? { shortDescription: body.data.shortDescription ?? null }
              : {}),
            ...(hasOwn(body.data, "description")
              ? { description: body.data.description ?? null }
              : {}),
            ...(hasOwn(body.data, "priceLabel")
              ? { priceLabel: body.data.priceLabel ?? null }
              : {}),
            ...(hasOwn(body.data, "durationMinutes")
              ? { durationMinutes: body.data.durationMinutes ?? null }
              : {}),
            ...(hasOwn(body.data, "status") ? { status: body.data.status } : {}),
            ...(hasOwn(body.data, "sortOrder") ? { sortOrder: body.data.sortOrder } : {}),
          },
        });
        return { status: "ok", item: mapService(item) };
      } catch (error) {
        if (isPrismaError(error, "P2002"))
          return reply
            .code(409)
            .send({ status: "error", error: "Service slug already exists for this business" });
        throw error;
      }
    },
  );

  app.delete(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/services/:serviceId",
    { preHandler: requirePermission("catalog.manage") },
    async (request, reply) => {
      const params = parsePayload(serviceParamsSchema, request.params);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      const business = await requireBusinessAccess(
        params.data.citySlug,
        params.data.businessSlug,
        request,
        "catalog.manage",
      );
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      const deleted = await prisma.businessService.deleteMany({
        where: { id: params.data.serviceId, businessId: business.id },
      });
      if (!deleted.count)
        return reply.code(404).send({ status: "error", error: "Service not found" });
      return reply.code(204).send();
    },
  );

  app.get(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/opening-hours",
    { preHandler: requirePermission("businesses.read") },
    async (request, reply) => {
      const params = parsePayload(businessParamsSchema, request.params);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      const business = await requireBusinessAccess(
        params.data.citySlug,
        params.data.businessSlug,
        request,
        "businesses.read",
      );
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      const items = await prisma.businessOpeningDay.findMany({
        where: { businessId: business.id },
        orderBy: { weekday: "asc" },
        include: { intervals: { orderBy: { sortOrder: "asc" } } },
      });
      return { status: "ok", items };
    },
  );

  app.put(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/opening-hours",
    { preHandler: requirePermission("settings.manage") },
    async (request, reply) => {
      const params = parsePayload(businessParamsSchema, request.params);
      const body = parsePayload(replaceOpeningWeekSchema, request.body);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      if (!body.success) return reply.code(body.response.statusCode).send(body.response.body);
      const validation = validateOpeningWeek(body.data.days);
      if (!validation.valid)
        return reply
          .code(400)
          .send({ status: "error", error: "Invalid opening hours", details: validation.errors });
      const business = await requireBusinessAccess(
        params.data.citySlug,
        params.data.businessSlug,
        request,
        "settings.manage",
      );
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      await prisma.$transaction(async (tx) => {
        await tx.businessOpeningDay.deleteMany({ where: { businessId: business.id } });
        for (const day of body.data.days) {
          await tx.businessOpeningDay.create({
            data: {
              businessId: business.id,
              weekday: day.weekday,
              isClosed: day.isClosed,
              note: day.note ?? null,
              intervals: {
                create: day.intervals.map((interval, sortOrder) => ({
                  opensAt: interval.opensAt,
                  closesAt: interval.closesAt,
                  sortOrder,
                })),
              },
            },
          });
        }
      });
      return { status: "ok" };
    },
  );

  app.get(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/publish-readiness",
    { preHandler: requirePermission("businesses.read") },
    async (request, reply) => {
      const params = parsePayload(businessParamsSchema, request.params);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      const business = await requireBusinessAccess(
        params.data.citySlug,
        params.data.businessSlug,
        request,
        "businesses.read",
      );
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      const item = await prisma.business.findUniqueOrThrow({
        where: { id: business.id },
        include: { city: true, categoryAssignments: { where: { category: { active: true } } } },
      });
      return {
        status: "ok",
        item: getBusinessPublishReadiness({
          name: item.name,
          slug: item.slug,
          cityStatus: item.city.status,
          cityActive: item.city.active,
          publicSubtitle: item.publicSubtitle,
          publicDescription: item.publicDescription,
          publicEmail: item.publicEmail,
          publicPhone: item.publicPhone,
          website: item.website,
          activeCategoryCount: item.categoryAssignments.length,
        }),
      };
    },
  );

  app.post(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/publish",
    { preHandler: requirePermission("businesses.manage") },
    async (request, reply) => {
      const params = parsePayload(businessParamsSchema, request.params);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      const business = await requireBusinessAccess(
        params.data.citySlug,
        params.data.businessSlug,
        request,
        "businesses.manage",
      );
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      const item = await prisma.business.findUniqueOrThrow({
        where: { id: business.id },
        include: { city: true, categoryAssignments: { where: { category: { active: true } } } },
      });
      const readiness = getBusinessPublishReadiness({
        name: item.name,
        slug: item.slug,
        cityStatus: item.city.status,
        cityActive: item.city.active,
        publicSubtitle: item.publicSubtitle,
        publicDescription: item.publicDescription,
        publicEmail: item.publicEmail,
        publicPhone: item.publicPhone,
        website: item.website,
        activeCategoryCount: item.categoryAssignments.length,
      });
      if (!readiness.canPublish)
        return reply
          .code(409)
          .send({ status: "error", error: "Business is not ready to publish", ...readiness });
      const auth = getRequestAuth(request);
      await prisma.$transaction(async (tx) => {
        await tx.business.update({
          where: { id: item.id },
          data: { status: "active", publishedAt: new Date() },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: auth.user.id,
            action: "business.published",
            targetType: "business",
            targetId: item.id,
            scopeType: "business",
            cityId: item.cityId,
            businessId: item.id,
            metadataJson: { previousStatus: item.status, nextStatus: "active" },
          },
        });
      });
      return { status: "ok", item: { ...readiness, businessStatus: "active" } };
    },
  );

  app.post(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/unpublish",
    { preHandler: requirePermission("businesses.manage") },
    async (request, reply) => {
      const params = parsePayload(businessParamsSchema, request.params);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      const business = await requireBusinessAccess(
        params.data.citySlug,
        params.data.businessSlug,
        request,
        "businesses.manage",
      );
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      const auth = getRequestAuth(request);
      const item = await prisma.business.findUniqueOrThrow({
        where: { id: business.id },
        select: { status: true, cityId: true },
      });
      await prisma.$transaction(async (tx) => {
        await tx.business.update({
          where: { id: business.id },
          data: { status: "draft", publishedAt: null },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: auth.user.id,
            action: "business.unpublished",
            targetType: "business",
            targetId: business.id,
            scopeType: "business",
            cityId: item.cityId,
            businessId: business.id,
            metadataJson: { previousStatus: item.status, nextStatus: "draft" },
          },
        });
      });
      return { status: "ok", businessStatus: "draft" };
    },
  );

  app.get(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/inquiries",
    { preHandler: requirePermission("businesses.read") },
    async (request, reply) => {
      const params = parsePayload(businessParamsSchema, request.params);
      const query = parsePayload(inquiryListQuerySchema, request.query);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      if (!query.success) return reply.code(query.response.statusCode).send(query.response.body);
      const business = await requireBusinessAccess(
        params.data.citySlug,
        params.data.businessSlug,
        request,
        "businesses.read",
      );
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      const where = { businessId: business.id, status: query.data.status };
      const [items, total] = await prisma.$transaction([
        prisma.businessInquiry.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (query.data.page - 1) * query.data.limit,
          take: query.data.limit,
        }),
        prisma.businessInquiry.count({ where }),
      ]);
      return {
        status: "ok",
        items: items.map(mapInquiry),
        page: query.data.page,
        limit: query.data.limit,
        total,
      };
    },
  );

  app.get(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/inquiries/:inquiryId",
    { preHandler: requirePermission("businesses.read") },
    async (request, reply) => {
      const params = parsePayload(inquiryParamsSchema, request.params);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      const business = await requireBusinessAccess(
        params.data.citySlug,
        params.data.businessSlug,
        request,
        "businesses.read",
      );
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      const item = await prisma.businessInquiry.findFirst({
        where: { id: params.data.inquiryId, businessId: business.id },
      });
      if (!item) return reply.code(404).send({ status: "error", error: "Inquiry not found" });
      return { status: "ok", item: mapInquiry(item) };
    },
  );

  app.patch(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/inquiries/:inquiryId",
    { preHandler: requirePermission("businesses.manage") },
    async (request, reply) => {
      const params = parsePayload(inquiryParamsSchema, request.params);
      const body = parsePayload(updateInquirySchema, request.body);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      if (!body.success) return reply.code(body.response.statusCode).send(body.response.body);
      if (Object.keys(body.data).length === 0)
        return reply.code(400).send({ status: "error", error: "No fields to update" });
      const business = await requireBusinessAccess(
        params.data.citySlug,
        params.data.businessSlug,
        request,
        "businesses.manage",
      );
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      const existing = await prisma.businessInquiry.findFirst({
        where: { id: params.data.inquiryId, businessId: business.id },
        select: { id: true, readAt: true, status: true },
      });
      if (!existing) return reply.code(404).send({ status: "error", error: "Inquiry not found" });
      if (
        hasOwn(body.data, "status") &&
        body.data.status &&
        !canTransitionInquiryStatus(existing.status, body.data.status)
      )
        return reply
          .code(409)
          .send({ status: "error", error: "Invalid inquiry status transition" });
      const item = await prisma.businessInquiry.update({
        where: { id: existing.id },
        data: {
          ...(hasOwn(body.data, "status")
            ? {
                status: body.data.status,
                readAt: body.data.status === "read" && !existing.readAt ? new Date() : undefined,
              }
            : {}),
          ...(hasOwn(body.data, "internalNote")
            ? { internalNote: body.data.internalNote ?? null }
            : {}),
        },
      });
      return { status: "ok", item: mapInquiry(item) };
    },
  );
}
