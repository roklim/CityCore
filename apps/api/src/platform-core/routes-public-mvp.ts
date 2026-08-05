import type { FastifyInstance } from "fastify";

import { prisma } from "../database.js";
import { publicInquirySchema } from "./mvp-schemas.js";
import { publicBusinessParamsSchema } from "./config.js";
import { createInquiryRateLimiter } from "./inquiry-guard.js";
import { parsePayload } from "./utils.js";

export function registerPublicBusinessMvpRoutes(app: FastifyInstance) {
  const inquiryRateLimiter = createInquiryRateLimiter();
  app.get(
    "/api/v2/public/cities/:citySlug/businesses/:businessSlug/services",
    async (request, reply) => {
      const params = parsePayload(publicBusinessParamsSchema, request.params);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      const business = await prisma.business.findFirst({
        where: {
          slug: params.data.businessSlug,
          status: "active",
          city: { slug: params.data.citySlug, active: true, status: "active" },
        },
        select: { id: true },
      });
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      const items = await prisma.businessService.findMany({
        where: { businessId: business.id, status: "published" },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          description: true,
          priceLabel: true,
          durationMinutes: true,
          sortOrder: true,
        },
      });
      return { status: "ok", items };
    },
  );

  app.get(
    "/api/v2/public/cities/:citySlug/businesses/:businessSlug/opening-hours",
    async (request, reply) => {
      const params = parsePayload(publicBusinessParamsSchema, request.params);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      const business = await prisma.business.findFirst({
        where: {
          slug: params.data.businessSlug,
          status: "active",
          city: { slug: params.data.citySlug, active: true, status: "active" },
        },
        select: { id: true, timezone: true },
      });
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      const items = await prisma.businessOpeningDay.findMany({
        where: { businessId: business.id },
        orderBy: { weekday: "asc" },
        include: { intervals: { orderBy: { sortOrder: "asc" } } },
      });
      return { status: "ok", timezone: business.timezone, items };
    },
  );

  app.post(
    "/api/v2/public/cities/:citySlug/businesses/:businessSlug/inquiries",
    async (request, reply) => {
      const params = parsePayload(publicBusinessParamsSchema, request.params);
      const body = parsePayload(publicInquirySchema, request.body);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      if (!body.success) return reply.code(body.response.statusCode).send(body.response.body);
      if (body.data.company) return reply.code(202).send({ status: "ok" });
      if (!inquiryRateLimiter.allows(request.ip))
        return reply
          .code(429)
          .send({ status: "error", error: "Too many inquiry requests. Try again later." });
      const business = await prisma.business.findFirst({
        where: {
          slug: params.data.businessSlug,
          status: "active",
          city: { slug: params.data.citySlug, active: true, status: "active" },
        },
        select: { id: true },
      });
      if (!business) return reply.code(404).send({ status: "error", error: "Business not found" });
      await prisma.businessInquiry.create({
        data: {
          businessId: business.id,
          name: body.data.name,
          email: body.data.email,
          phone: body.data.phone ?? null,
          message: body.data.message,
          privacyAccepted: true,
        },
      });
      return reply.code(201).send({ status: "ok" });
    },
  );
}
