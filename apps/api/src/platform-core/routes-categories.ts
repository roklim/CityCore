import type { FastifyInstance } from "fastify";

import { canAccess, getRequestAuth, requirePermission } from "../auth.js";
import { prisma } from "../database.js";
import { buildCategoryTree, canSetCategoryParent } from "./mvp-domain.js";
import {
  businessParamsSchema,
  businessCategoryParamsSchema,
  categoryParamsSchema,
  cityParamsSchema,
  createCategorySchema,
  replaceBusinessCategoriesSchema,
  updateCategorySchema,
} from "./mvp-schemas.js";
import { hasOwn, isPrismaError, parsePayload, slugify } from "./utils.js";

function mapCategory(category: {
  id: string;
  cityId: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return category;
}

export function registerCategoryRoutes(app: FastifyInstance) {
  app.get(
    "/api/v2/platform-core/cities/:citySlug/categories",
    { preHandler: requirePermission("cities.read") },
    async (request, reply) => {
      const params = parsePayload(cityParamsSchema, request.params);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      const auth = getRequestAuth(request);
      const city = await prisma.city.findUnique({
        where: { slug: params.data.citySlug },
        select: { id: true },
      });
      if (
        !city ||
        !canAccess(auth.activeAccess, "cities.read", { scopeType: "city", cityId: city.id })
      ) {
        return reply.code(404).send({ status: "error", error: "City not found" });
      }
      const items = await prisma.cityCategory.findMany({
        where: { cityId: city.id },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
      return { status: "ok", items: items.map(mapCategory), tree: buildCategoryTree(items) };
    },
  );

  app.post(
    "/api/v2/platform-core/cities/:citySlug/categories",
    { preHandler: requirePermission("cities.manage") },
    async (request, reply) => {
      const params = parsePayload(cityParamsSchema, request.params);
      const body = parsePayload(createCategorySchema, request.body);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      if (!body.success) return reply.code(body.response.statusCode).send(body.response.body);
      const auth = getRequestAuth(request);
      const city = await prisma.city.findUnique({
        where: { slug: params.data.citySlug },
        select: { id: true },
      });
      if (
        !city ||
        !canAccess(auth.activeAccess, "cities.manage", { scopeType: "city", cityId: city.id })
      ) {
        return reply.code(404).send({ status: "error", error: "City not found" });
      }
      if (body.data.parentId) {
        const parent = await prisma.cityCategory.findFirst({
          where: { id: body.data.parentId, cityId: city.id },
          select: { id: true, parentId: true },
        });
        if (!parent || parent.parentId)
          return reply
            .code(400)
            .send({ status: "error", error: "Parent must be a root category in the same city" });
      }
      try {
        const item = await prisma.cityCategory.create({
          data: {
            cityId: city.id,
            name: body.data.name,
            slug: slugify(body.data.slug ?? body.data.name),
            description: body.data.description ?? null,
            parentId: body.data.parentId ?? null,
            active: body.data.active,
            sortOrder: body.data.sortOrder,
          },
        });
        return reply.code(201).send({ status: "ok", item: mapCategory(item) });
      } catch (error) {
        if (isPrismaError(error, "P2002"))
          return reply
            .code(409)
            .send({ status: "error", error: "Category slug already exists in this city" });
        throw error;
      }
    },
  );

  app.get(
    "/api/v2/platform-core/cities/:citySlug/categories/:categoryId",
    { preHandler: requirePermission("cities.read") },
    async (request, reply) => {
      const params = parsePayload(categoryParamsSchema, request.params);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      const auth = getRequestAuth(request);
      const item = await prisma.cityCategory.findFirst({
        where: { id: params.data.categoryId, city: { slug: params.data.citySlug } },
      });
      if (
        !item ||
        !canAccess(auth.activeAccess, "cities.read", { scopeType: "city", cityId: item.cityId })
      )
        return reply.code(404).send({ status: "error", error: "Category not found" });
      return { status: "ok", item: mapCategory(item) };
    },
  );

  app.patch(
    "/api/v2/platform-core/cities/:citySlug/categories/:categoryId",
    { preHandler: requirePermission("cities.manage") },
    async (request, reply) => {
      const params = parsePayload(categoryParamsSchema, request.params);
      const body = parsePayload(updateCategorySchema, request.body);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      if (!body.success) return reply.code(body.response.statusCode).send(body.response.body);
      if (Object.keys(body.data).length === 0)
        return reply.code(400).send({ status: "error", error: "No fields to update" });
      const auth = getRequestAuth(request);
      const item = await prisma.cityCategory.findFirst({
        where: { id: params.data.categoryId, city: { slug: params.data.citySlug } },
      });
      if (
        !item ||
        !canAccess(auth.activeAccess, "cities.manage", { scopeType: "city", cityId: item.cityId })
      )
        return reply.code(404).send({ status: "error", error: "Category not found" });
      if (hasOwn(body.data, "parentId")) {
        if (body.data.parentId) {
          const categories = await prisma.cityCategory.findMany({
            where: { cityId: item.cityId },
            select: { id: true, parentId: true },
          });
          const parentById = new Map(
            categories.map((category) => [category.id, category.parentId]),
          );
          const parent = categories.find((category) => category.id === body.data.parentId);
          if (
            !parent ||
            parent.parentId ||
            !canSetCategoryParent(item.id, body.data.parentId, parentById)
          )
            return reply.code(400).send({ status: "error", error: "Invalid category parent" });
        }
      }
      try {
        const updated = await prisma.cityCategory.update({
          where: { id: item.id },
          data: {
            ...(hasOwn(body.data, "name") && body.data.name ? { name: body.data.name } : {}),
            ...(hasOwn(body.data, "slug") && body.data.slug
              ? { slug: slugify(body.data.slug) }
              : {}),
            ...(hasOwn(body.data, "description")
              ? { description: body.data.description ?? null }
              : {}),
            ...(hasOwn(body.data, "parentId") ? { parentId: body.data.parentId ?? null } : {}),
            ...(hasOwn(body.data, "active") ? { active: body.data.active } : {}),
            ...(hasOwn(body.data, "sortOrder") ? { sortOrder: body.data.sortOrder } : {}),
          },
        });
        return { status: "ok", item: mapCategory(updated) };
      } catch (error) {
        if (isPrismaError(error, "P2002"))
          return reply
            .code(409)
            .send({ status: "error", error: "Category slug already exists in this city" });
        throw error;
      }
    },
  );

  app.delete(
    "/api/v2/platform-core/cities/:citySlug/categories/:categoryId",
    { preHandler: requirePermission("cities.manage") },
    async (request, reply) => {
      const params = parsePayload(categoryParamsSchema, request.params);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      const auth = getRequestAuth(request);
      const item = await prisma.cityCategory.findFirst({
        where: { id: params.data.categoryId, city: { slug: params.data.citySlug } },
        include: { _count: { select: { children: true, businessAssignments: true } } },
      });
      if (
        !item ||
        !canAccess(auth.activeAccess, "cities.manage", { scopeType: "city", cityId: item.cityId })
      )
        return reply.code(404).send({ status: "error", error: "Category not found" });
      if (item._count.children || item._count.businessAssignments)
        return reply.code(409).send({
          status: "error",
          error: "Category with children or assignments cannot be deleted; deactivate it instead",
        });
      await prisma.cityCategory.delete({ where: { id: item.id } });
      return reply.code(204).send();
    },
  );

  app.get(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/categories",
    { preHandler: requirePermission("businesses.read") },
    async (request, reply) => {
      const params = parsePayload(businessParamsSchema, request.params);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      const auth = getRequestAuth(request);
      const business = await prisma.business.findFirst({
        where: { slug: params.data.businessSlug, city: { slug: params.data.citySlug } },
        select: { id: true, cityId: true },
      });
      if (
        !business ||
        !canAccess(auth.activeAccess, "businesses.read", {
          scopeType: "business",
          cityId: business.cityId,
          businessId: business.id,
        })
      )
        return reply.code(404).send({ status: "error", error: "Business not found" });
      const items = await prisma.businessCategoryAssignment.findMany({
        where: { businessId: business.id },
        orderBy: [{ primary: "desc" }, { sortOrder: "asc" }],
        include: { category: true },
      });
      return {
        status: "ok",
        items: items.map((item) => ({
          ...mapCategory(item.category),
          primary: item.primary,
          assignmentId: item.id,
          sortOrder: item.sortOrder,
        })),
      };
    },
  );

  app.put(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/categories",
    { preHandler: requirePermission("businesses.manage") },
    async (request, reply) => {
      const params = parsePayload(businessParamsSchema, request.params);
      const body = parsePayload(replaceBusinessCategoriesSchema, request.body);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      if (!body.success) return reply.code(body.response.statusCode).send(body.response.body);
      const auth = getRequestAuth(request);
      const business = await prisma.business.findFirst({
        where: { slug: params.data.businessSlug, city: { slug: params.data.citySlug } },
        select: { id: true, cityId: true },
      });
      if (
        !business ||
        !canAccess(auth.activeAccess, "businesses.manage", {
          scopeType: "business",
          cityId: business.cityId,
          businessId: business.id,
        })
      )
        return reply.code(404).send({ status: "error", error: "Business not found" });
      const categories = await prisma.cityCategory.findMany({
        where: { id: { in: body.data.categoryIds }, cityId: business.cityId, active: true },
        select: { id: true },
      });
      if (categories.length !== body.data.categoryIds.length)
        return reply.code(400).send({
          status: "error",
          error: "All categories must be active and belong to the business city",
        });
      await prisma.$transaction(async (tx) => {
        await tx.businessCategoryAssignment.deleteMany({ where: { businessId: business.id } });
        await tx.businessCategoryAssignment.createMany({
          data: body.data.categoryIds.map((categoryId, sortOrder) => ({
            businessId: business.id,
            categoryId,
            primary: categoryId === body.data.primaryCategoryId,
            sortOrder,
          })),
        });
      });
      return {
        status: "ok",
        categoryIds: body.data.categoryIds,
        primaryCategoryId: body.data.primaryCategoryId ?? null,
      };
    },
  );

  app.delete(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug/categories/:categoryId",
    { preHandler: requirePermission("businesses.manage") },
    async (request, reply) => {
      const params = parsePayload(businessCategoryParamsSchema, request.params);
      if (!params.success) return reply.code(params.response.statusCode).send(params.response.body);
      const auth = getRequestAuth(request);
      const business = await prisma.business.findFirst({
        where: { slug: params.data.businessSlug, city: { slug: params.data.citySlug } },
        select: { id: true, cityId: true },
      });
      if (
        !business ||
        !canAccess(auth.activeAccess, "businesses.manage", {
          scopeType: "business",
          cityId: business.cityId,
          businessId: business.id,
        })
      )
        return reply.code(404).send({ status: "error", error: "Business not found" });
      const deleted = await prisma.businessCategoryAssignment.deleteMany({
        where: { businessId: business.id, categoryId: params.data.categoryId },
      });
      if (!deleted.count)
        return reply.code(404).send({ status: "error", error: "Category assignment not found" });
      return reply.code(204).send();
    },
  );
}
