import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { canAccess, getRequestAuth, requireAuth } from "../auth.js";
import { prisma } from "../database.js";
import {
  businessParamsSchema,
  createMenuCategorySchema,
  createMenuItemSchema,
  menuItemParamsSchema,
  updateMenuItemSchema,
} from "./config.js";
import { findBusinessForOrdering, hasOrderingEnabled } from "./business.js";
import { isPrismaError, mapMenuCategory, mapMenuItem, parsePayload, slugify } from "./shared.js";

export function registerOrderingMenuRoutes(app: FastifyInstance) {
  app.get(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/menu",
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
        !canAccess(auth.activeAccess, "businesses.read", {
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

      const categories = await prisma.menuCategory.findMany({
        where: {
          businessId: business.id,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          items: {
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
          status: business.status,
          city: business.city,
          orderingEnabled: hasOrderingEnabled(business),
        },
        categories: categories.map(mapMenuCategory),
      });
    },
  );

  app.post(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/categories",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(businessParamsSchema, request.params);
      const bodyParsed = parsePayload(createMenuCategorySchema, request.body);

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
        !canAccess(auth.activeAccess, "menu.manage", {
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
        const category = await prisma.$transaction(async (tx) => {
          const createdCategory = await tx.menuCategory.create({
            data: {
              businessId: business.id,
              name: bodyParsed.data.name,
              slug: slugify(bodyParsed.data.slug ?? bodyParsed.data.name),
              sortOrder: bodyParsed.data.sortOrder,
              active: bodyParsed.data.active,
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: auth.user.id,
              action: "ordering.menu_category.created",
              targetType: "menu_category",
              targetId: createdCategory.id,
              scopeType: "business",
              cityId: business.city.id,
              businessId: business.id,
              metadataJson: {
                slug: createdCategory.slug,
                name: createdCategory.name,
              },
            },
          });

          return createdCategory;
        });

        return reply.code(201).send({
          status: "ok",
          item: mapMenuCategory(category),
        });
      } catch (error) {
        if (isPrismaError(error, "P2002")) {
          return reply.code(409).send({
            status: "error",
            error: "A menu category with the same slug already exists for this business.",
          });
        }

        throw error;
      }
    },
  );

  app.post(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/items",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(businessParamsSchema, request.params);
      const bodyParsed = parsePayload(createMenuItemSchema, request.body);

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
        !canAccess(auth.activeAccess, "menu.manage", {
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

      const category = bodyParsed.data.categorySlug
        ? await prisma.menuCategory.findFirst({
            where: {
              businessId: business.id,
              slug: bodyParsed.data.categorySlug,
            },
            select: {
              id: true,
              slug: true,
            },
          })
        : null;

      if (bodyParsed.data.categorySlug && !category) {
        return reply.code(404).send({
          status: "error",
          error: "Menu category not found",
        });
      }

      try {
        const item = await prisma.$transaction(async (tx) => {
          const createdItem = await tx.menuItem.create({
            data: {
              businessId: business.id,
              categoryId: category?.id ?? null,
              name: bodyParsed.data.name,
              slug: slugify(bodyParsed.data.slug ?? bodyParsed.data.name),
              description: bodyParsed.data.description ?? null,
              price: new Prisma.Decimal(bodyParsed.data.price),
              compareAtPrice:
                bodyParsed.data.compareAtPrice != null
                  ? new Prisma.Decimal(bodyParsed.data.compareAtPrice)
                  : null,
              available: bodyParsed.data.available,
              featured: bodyParsed.data.featured,
              emoji: bodyParsed.data.emoji ?? null,
              imageUrl: bodyParsed.data.imageUrl ?? null,
              unit: bodyParsed.data.unit ?? null,
              tagsJson: bodyParsed.data.tags ?? Prisma.JsonNull,
              allergensJson: bodyParsed.data.allergens ?? Prisma.JsonNull,
              sortOrder: bodyParsed.data.sortOrder,
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: auth.user.id,
              action: "ordering.menu_item.created",
              targetType: "menu_item",
              targetId: createdItem.id,
              scopeType: "business",
              cityId: business.city.id,
              businessId: business.id,
              metadataJson: {
                slug: createdItem.slug,
                name: createdItem.name,
                categorySlug: category?.slug ?? null,
              },
            },
          });

          return createdItem;
        });

        return reply.code(201).send({
          status: "ok",
          item: mapMenuItem(item),
        });
      } catch (error) {
        if (isPrismaError(error, "P2002")) {
          return reply.code(409).send({
            status: "error",
            error: "A menu item with the same slug already exists for this business.",
          });
        }

        throw error;
      }
    },
  );

  app.patch(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/items/:itemId",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(menuItemParamsSchema, request.params);
      const bodyParsed = parsePayload(updateMenuItemSchema, request.body);

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
        !canAccess(auth.activeAccess, "menu.manage", {
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

      const existingItem = await prisma.menuItem.findFirst({
        where: {
          id: paramsParsed.data.itemId,
          businessId: business.id,
        },
        select: {
          id: true,
          categoryId: true,
        },
      });

      if (!existingItem) {
        return reply.code(404).send({
          status: "error",
          error: "Menu item not found",
        });
      }

      let categoryId = existingItem.categoryId;
      let categorySlug: string | null = null;

      if (bodyParsed.data.categorySlug !== undefined) {
        if (bodyParsed.data.categorySlug === null) {
          categoryId = null;
        } else {
          const category = await prisma.menuCategory.findFirst({
            where: {
              businessId: business.id,
              slug: bodyParsed.data.categorySlug,
            },
            select: {
              id: true,
              slug: true,
            },
          });

          if (!category) {
            return reply.code(404).send({
              status: "error",
              error: "Menu category not found",
            });
          }

          categoryId = category.id;
          categorySlug = category.slug;
        }
      }

      try {
        const item = await prisma.$transaction(async (tx) => {
          const updatedItem = await tx.menuItem.update({
            where: {
              id: existingItem.id,
            },
            data: {
              categoryId,
              ...(bodyParsed.data.name !== undefined ? { name: bodyParsed.data.name } : {}),
              ...(bodyParsed.data.slug !== undefined
                ? { slug: slugify(bodyParsed.data.slug) }
                : {}),
              ...(bodyParsed.data.description !== undefined
                ? { description: bodyParsed.data.description ?? null }
                : {}),
              ...(bodyParsed.data.price !== undefined
                ? { price: new Prisma.Decimal(bodyParsed.data.price) }
                : {}),
              ...(bodyParsed.data.compareAtPrice !== undefined
                ? {
                    compareAtPrice:
                      bodyParsed.data.compareAtPrice != null
                        ? new Prisma.Decimal(bodyParsed.data.compareAtPrice)
                        : null,
                  }
                : {}),
              ...(bodyParsed.data.available !== undefined
                ? { available: bodyParsed.data.available }
                : {}),
              ...(bodyParsed.data.featured !== undefined
                ? { featured: bodyParsed.data.featured }
                : {}),
              ...(bodyParsed.data.emoji !== undefined
                ? { emoji: bodyParsed.data.emoji ?? null }
                : {}),
              ...(bodyParsed.data.imageUrl !== undefined
                ? { imageUrl: bodyParsed.data.imageUrl ?? null }
                : {}),
              ...(bodyParsed.data.unit !== undefined ? { unit: bodyParsed.data.unit ?? null } : {}),
              ...(bodyParsed.data.tags !== undefined ? { tagsJson: bodyParsed.data.tags } : {}),
              ...(bodyParsed.data.allergens !== undefined
                ? { allergensJson: bodyParsed.data.allergens }
                : {}),
              ...(bodyParsed.data.sortOrder !== undefined
                ? { sortOrder: bodyParsed.data.sortOrder }
                : {}),
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: auth.user.id,
              action: "ordering.menu_item.updated",
              targetType: "menu_item",
              targetId: updatedItem.id,
              scopeType: "business",
              cityId: business.city.id,
              businessId: business.id,
              metadataJson: {
                categorySlug,
                fields: Object.keys(bodyParsed.data),
              },
            },
          });

          return updatedItem;
        });

        return reply.send({
          status: "ok",
          item: mapMenuItem(item),
        });
      } catch (error) {
        if (isPrismaError(error, "P2002")) {
          return reply.code(409).send({
            status: "error",
            error: "A menu item with the same slug already exists for this business.",
          });
        }

        throw error;
      }
    },
  );

  app.patch(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/items/:itemId/availability",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(menuItemParamsSchema, request.params);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
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
        !canAccess(auth.activeAccess, "menu.manage", {
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

      const item = await prisma.menuItem.findFirst({
        where: {
          id: paramsParsed.data.itemId,
          businessId: business.id,
        },
        select: {
          id: true,
          available: true,
        },
      });

      if (!item) {
        return reply.code(404).send({
          status: "error",
          error: "Menu item not found",
        });
      }

      const updatedItem = await prisma.$transaction(async (tx) => {
        const next = await tx.menuItem.update({
          where: {
            id: item.id,
          },
          data: {
            available: !item.available,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: auth.user.id,
            action: "ordering.menu_item.availability_toggled",
            targetType: "menu_item",
            targetId: next.id,
            scopeType: "business",
            cityId: business.city.id,
            businessId: business.id,
            metadataJson: {
              available: next.available,
            },
          },
        });

        return next;
      });

      return reply.send({
        status: "ok",
        item: mapMenuItem(updatedItem),
      });
    },
  );

  app.delete(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/items/:itemId",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(menuItemParamsSchema, request.params);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
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
        !canAccess(auth.activeAccess, "menu.manage", {
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

      const item = await prisma.menuItem.findFirst({
        where: {
          id: paramsParsed.data.itemId,
          businessId: business.id,
        },
        select: {
          id: true,
          slug: true,
          name: true,
        },
      });

      if (!item) {
        return reply.code(404).send({
          status: "error",
          error: "Menu item not found",
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.menuItem.delete({
          where: {
            id: item.id,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: auth.user.id,
            action: "ordering.menu_item.deleted",
            targetType: "menu_item",
            targetId: item.id,
            scopeType: "business",
            cityId: business.city.id,
            businessId: business.id,
            metadataJson: {
              slug: item.slug,
              name: item.name,
            },
          },
        });
      });

      return reply.send({
        status: "ok",
        deleted: true,
      });
    },
  );
}
