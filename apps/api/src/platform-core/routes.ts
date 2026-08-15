import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import {
  canAccess,
  getRequestAuth,
  hashPassword,
  requireAuth,
  requirePermission,
} from "../auth.js";
import { prisma } from "../database.js";
import {
  buildAccessibleAccessGrantFilter,
  buildAccessibleAuditLogFilter,
  buildAccessibleBusinessFilter,
  buildAccessibleCityFilter,
} from "./access.js";
import {
  type ModuleCode,
  accessGrantParamsSchema,
  createAccessGrantSchema,
  createBusinessSchema,
  createCitySchema,
  listAccessGrantsQuerySchema,
  listAuditLogsQuerySchema,
  listBusinessesQuerySchema,
  listCitiesQuerySchema,
  listCityRegistryQuerySchema,
  publicBusinessParamsSchema,
  publicCityParamsSchema,
  templateCatalog,
  templateCatalogMap,
  updateAccessGrantSchema,
  updateBusinessSchema,
  updateCitySchema,
} from "./config.js";
import {
  mapAccessGrant,
  mapAuditLog,
  mapBusiness,
  mapCity,
  mapCityRegistryEntry,
} from "./mappers.js";
import { registerPublicPlatformRoutes } from "./routes-public.js";
import { registerCategoryRoutes } from "./routes-categories.js";
import { registerBusinessMvpRoutes } from "./routes-business-mvp.js";
import { registerPublicBusinessMvpRoutes } from "./routes-public-mvp.js";
import { registerPickupOrderingRoutes } from "./routes-pickup-ordering.js";
import { ensureTemplateRecord } from "./template-service.js";
import { buildBusinessUpdateData, buildCityUpdateData } from "./update-data.js";
import { getBusinessPublishReadiness } from "./mvp-domain.js";
import {
  hasOwn,
  isPrismaError,
  normalizeColor,
  normalizeOptionalString,
  parsePayload,
  slugify,
} from "./utils.js";

const CITY_SLUG_MAX_LENGTH = 120;

function fitCitySlug(rawValue: string, stableSeed = rawValue) {
  const normalized = slugify(rawValue);
  if (normalized.length <= CITY_SLUG_MAX_LENGTH) {
    return normalized;
  }

  const digest = createHash("sha256").update(stableSeed).digest("hex").slice(0, 12);
  const prefix = normalized
    .slice(0, CITY_SLUG_MAX_LENGTH - digest.length - 1)
    .replace(/-+$/g, "");
  return `${prefix}-${digest}`;
}

function buildRegistryCitySlugCandidates(
  baseSlug: string,
  registry: {
    id: string;
    admin1Name: string | null;
    admin2Name: string | null;
    regionName: string | null;
    provinceName: string | null;
    admin1Code: string | null;
    admin2Code: string | null;
    regionCode: string | null;
    provinceCode: string | null;
    country: string;
    countryName: string | null;
    source: string | null;
    externalId: string | null;
    istatCode: string | null;
    cadastralCode: string | null;
  },
) {
  const areaCandidates = [
    registry.admin1Name,
    registry.admin2Name,
    registry.regionName,
    registry.provinceName,
    registry.admin1Code,
    registry.admin2Code,
    registry.regionCode,
    registry.provinceCode,
  ].filter((value): value is string => Boolean(value?.trim()));
  const primaryArea = areaCandidates[0] ?? null;
  const country = registry.country || registry.countryName || null;
  const stableIdentity =
    registry.source && registry.externalId
      ? `${registry.source}-${registry.externalId}`
      : registry.istatCode
        ? `istat-${registry.istatCode}`
        : registry.cadastralCode
          ? `cadastral-${registry.cadastralCode}`
          : `registry-${registry.id}`;

  const rawCandidates = [baseSlug];
  if (primaryArea) rawCandidates.push(`${baseSlug}-${primaryArea}`);
  if (country) rawCandidates.push(`${baseSlug}-${country}`);
  if (primaryArea && country) rawCandidates.push(`${baseSlug}-${primaryArea}-${country}`);

  for (const area of areaCandidates.slice(1)) {
    rawCandidates.push(`${baseSlug}-${area}`);
    if (country) rawCandidates.push(`${baseSlug}-${area}-${country}`);
  }

  rawCandidates.push(`${baseSlug}-${stableIdentity}`);
  rawCandidates.push(
    `${baseSlug}-${createHash("sha256")
      .update(`${registry.id}:${stableIdentity}`)
      .digest("hex")
      .slice(0, 12)}`,
  );

  return [
    ...new Set(
      rawCandidates
        .map((candidate) => fitCitySlug(candidate, `${registry.id}:${candidate}`))
        .filter(Boolean),
    ),
  ];
}

function isPrismaUniqueConstraintOn(error: unknown, targetName: string) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  const targetValues = Array.isArray(target) ? target : target == null ? [] : [target];
  const normalizedTargetName = targetName.toLowerCase().replace(/[^a-z0-9]/g, "");

  return targetValues.some((value) =>
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .includes(normalizedTargetName),
  );
}

export function registerPlatformCoreRouteGroup(app: FastifyInstance) {
  registerPublicPlatformRoutes(app);
  registerPublicBusinessMvpRoutes(app);
  registerPickupOrderingRoutes(app);
  registerCategoryRoutes(app);
  registerBusinessMvpRoutes(app);

  app.get(
    "/api/v2/platform-core",
    { preHandler: requirePermission("platform.read") },
    async () => ({
      status: "ok",
      surface: "platform-core",
      capabilities: {
        templates: ["/api/v2/platform-core/templates"],
        cityRegistry: ["/api/v2/platform-core/city-registry"],
        cities: ["/api/v2/platform-core/cities"],
        businesses: ["/api/v2/platform-core/businesses"],
        accessGrants: ["/api/v2/platform-core/access-grants"],
        auditLogs: ["/api/v2/platform-core/audit-logs"],
      },
    }),
  );

  app.get(
    "/api/v2/platform-core/templates",
    { preHandler: requirePermission("platform.read") },
    async () => {
      const persistedTemplates = await prisma.businessTemplate.findMany({
        select: {
          id: true,
          code: true,
          active: true,
          updatedAt: true,
        },
      });

      const persistedByCode = new Map(
        persistedTemplates.map((template) => [template.code, template]),
      );

      return {
        status: "ok",
        items: templateCatalog.map((template) => {
          const persisted = persistedByCode.get(template.code);

          return {
            ...template,
            persisted: Boolean(persisted),
            templateId: persisted?.id ?? null,
            active: persisted?.active ?? true,
            updatedAt: persisted?.updatedAt ?? null,
          };
        }),
      };
    },
  );

  app.get(
    "/api/v2/platform-core/city-registry",
    { preHandler: requirePermission("platform.read", () => ({ scopeType: "platform" })) },
    async (request, reply) => {
      const parsed = parsePayload(listCityRegistryQuerySchema, request.query);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const filters: Prisma.CityRegistryWhereInput[] = [];

      if (parsed.data.q) {
        filters.push({
          OR: [
            {
              searchText: {
                contains: parsed.data.q.toLowerCase(),
              },
            },
            {
              name: {
                contains: parsed.data.q,
                mode: "insensitive",
              },
            },
            {
              slug: {
                contains: slugify(parsed.data.q),
              },
            },
          ],
        });
      }

      if (parsed.data.provinceCode) {
        filters.push({
          provinceCode: parsed.data.provinceCode.toUpperCase(),
        });
      }

      if (parsed.data.regionCode) {
        filters.push({
          regionCode: parsed.data.regionCode,
        });
      }

      if (parsed.data.activeMunicipality != null) {
        filters.push({
          activeMunicipality: parsed.data.activeMunicipality,
        });
      }

      if (parsed.data.linked === true) {
        filters.push({
          cities: {
            some: {},
          },
        });
      } else if (parsed.data.linked === false) {
        filters.push({
          cities: {
            none: {},
          },
        });
      }

      const where: Prisma.CityRegistryWhereInput | undefined =
        filters.length > 0 ? { AND: filters } : undefined;
      const [entries, total] = await prisma.$transaction([
        prisma.cityRegistry.findMany({
          where,
          orderBy: [{ name: "asc" }],
          skip: (parsed.data.page - 1) * parsed.data.limit,
          take: parsed.data.limit,
          include: {
            cities: {
              orderBy: [{ createdAt: "asc" }],
              take: 1,
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                active: true,
              },
            },
          },
        }),
        prisma.cityRegistry.count({ where }),
      ]);

      return reply.send({
        status: "ok",
        items: entries.map(mapCityRegistryEntry),
        page: parsed.data.page,
        limit: parsed.data.limit,
        total,
        totalPages: Math.ceil(total / parsed.data.limit),
      });
    },
  );

  app.get(
    "/api/v2/platform-core/cities",
    { preHandler: requirePermission("cities.read") },
    async (request, reply) => {
      const parsed = parsePayload(listCitiesQuerySchema, request.query);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const where: Prisma.CityWhereInput = {
        ...buildAccessibleCityFilter(auth),
        status: parsed.data.status,
        active: parsed.data.active,
        ...(parsed.data.q
          ? {
              OR: [
                { name: { contains: parsed.data.q, mode: "insensitive" as const } },
                { slug: { contains: slugify(parsed.data.q) } },
                { province: { contains: parsed.data.q, mode: "insensitive" as const } },
                { region: { contains: parsed.data.q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };
      const [cities, total] = await prisma.$transaction([
        prisma.city.findMany({
          where,
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          skip: (parsed.data.page - 1) * parsed.data.limit,
          take: parsed.data.limit,
          include: {
            _count: {
              select: {
                businesses: true,
                categories: {
                  where: {
                    active: true,
                  },
                },
              },
            },
          },
        }),
        prisma.city.count({ where }),
      ]);

      return {
        status: "ok",
        items: cities.map(mapCity),
        page: parsed.data.page,
        limit: parsed.data.limit,
        total,
        totalPages: Math.ceil(total / parsed.data.limit),
      };
    },
  );

  app.post(
    "/api/v2/platform-core/cities",
    { preHandler: requirePermission("platform.manage", () => ({ scopeType: "platform" })) },
    async (request, reply) => {
      const parsed = parsePayload(createCitySchema, request.body);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const normalizedCitySlug = slugify(parsed.data.slug ?? parsed.data.name);

      if (!normalizedCitySlug) {
        return reply.code(400).send({ status: "error", error: "City slug cannot be empty" });
      }

      const registry = parsed.data.registryId
        ? await prisma.cityRegistry.findUnique({
            where: {
              id: parsed.data.registryId,
            },
            select: {
              id: true,
              admin1Name: true,
              admin2Name: true,
              regionName: true,
              provinceName: true,
              admin1Code: true,
              admin2Code: true,
              regionCode: true,
              provinceCode: true,
              country: true,
              countryName: true,
              source: true,
              externalId: true,
              istatCode: true,
              cadastralCode: true,
              cities: {
                take: 1,
                select: {
                  id: true,
                },
              },
            },
          })
        : null;

      if (parsed.data.registryId && !registry) {
        return reply.code(404).send({
          status: "error",
          error: "City registry entry not found",
        });
      }

      if (registry?.cities.length) {
        return reply.code(409).send({
          status: "error",
          error: "This city registry entry is already activated.",
        });
      }

      const createCityWithSlug = (citySlug: string) =>
        prisma.$transaction(async (tx) => {
          const createdCity = await tx.city.create({
            data: {
              registryId: parsed.data.registryId ?? null,
              name: parsed.data.name,
              slug: citySlug,
              province: parsed.data.province ?? null,
              region: parsed.data.region ?? null,
              country: parsed.data.country ?? "IT",
              status: parsed.data.status,
              active: parsed.data.active,
              heroTitle: parsed.data.heroTitle ?? null,
              heroDescription: parsed.data.heroDescription ?? null,
              seoTitle: parsed.data.seoTitle ?? null,
              seoDescription: parsed.data.seoDescription ?? null,
              sortOrder: parsed.data.sortOrder,
            },
            include: {
              _count: {
                select: {
                  businesses: true,
                },
              },
            },
          });

          if (registry && createdCity.slug !== citySlug) {
            await tx.city.delete({ where: { id: createdCity.id } });
            return null;
          }

          await tx.auditLog.create({
            data: {
              actorUserId: auth.user.id,
              action: "platform.city.created",
              targetType: "city",
              targetId: createdCity.id,
              scopeType: "platform",
              cityId: createdCity.id,
              metadataJson: {
                slug: createdCity.slug,
                status: createdCity.status,
              },
            },
          });

          return createdCity;
        });

      if (!registry) {
        try {
          const city = await createCityWithSlug(normalizedCitySlug);
          if (!city) {
            return reply.code(409).send({
              status: "error",
              error: "A city with the same slug or registry reference already exists.",
            });
          }

          return reply.code(201).send({
            status: "ok",
            item: mapCity(city),
          });
        } catch (error) {
          if (isPrismaError(error, "P2002")) {
            return reply.code(409).send({
              status: "error",
              error: "A city with the same slug or registry reference already exists.",
            });
          }

          throw error;
        }
      }

      const slugCandidates = buildRegistryCitySlugCandidates(normalizedCitySlug, registry);

      for (const citySlug of slugCandidates) {
        try {
          const city = await createCityWithSlug(citySlug);
          if (!city) {
            continue;
          }

          return reply.code(201).send({
            status: "ok",
            item: mapCity(city),
          });
        } catch (error) {
          if (!isPrismaError(error, "P2002")) {
            throw error;
          }

          if (isPrismaUniqueConstraintOn(error, "registryId")) {
            return reply.code(409).send({
              status: "error",
              error: "This city registry entry is already activated.",
            });
          }

          if (isPrismaUniqueConstraintOn(error, "slug")) {
            continue;
          }

          const [linkedCity, slugOwner] = await Promise.all([
            prisma.city.findUnique({
              where: { registryId: registry.id },
              select: { id: true },
            }),
            prisma.city.findUnique({
              where: { slug: citySlug },
              select: { id: true },
            }),
          ]);

          if (linkedCity) {
            return reply.code(409).send({
              status: "error",
              error: "This city registry entry is already activated.",
            });
          }

          if (slugOwner) {
            continue;
          }

          return reply.code(409).send({
            status: "error",
            error: "A city with the same slug or registry reference already exists.",
          });
        }
      }

      return reply.code(409).send({
        status: "error",
        error: "Unable to allocate a unique public slug for this city registry entry.",
      });
    },
  );

  app.patch(
    "/api/v2/platform-core/cities/:citySlug",
    { preHandler: requirePermission("cities.manage") },
    async (request, reply) => {
      const params = parsePayload(publicCityParamsSchema, request.params);
      const parsed = parsePayload(updateCitySchema, request.body);

      if (!params.success) {
        return reply.code(params.response.statusCode).send(params.response.body);
      }

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      if (Object.keys(parsed.data).length === 0) {
        return reply.code(400).send({
          status: "error",
          error: "No fields to update",
        });
      }

      if (hasOwn(parsed.data, "slug") && parsed.data.slug && !slugify(parsed.data.slug)) {
        return reply.code(400).send({ status: "error", error: "City slug cannot be empty" });
      }

      const auth = getRequestAuth(request);
      const city = await prisma.city.findUnique({
        where: {
          slug: params.data.citySlug,
        },
        select: {
          id: true,
          slug: true,
          status: true,
        },
      });

      if (!city) {
        return reply.code(404).send({
          status: "error",
          error: "City not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "cities.manage", {
          scopeType: "city",
          cityId: city.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      if (hasOwn(parsed.data, "registryId") && parsed.data.registryId) {
        const registry = await prisma.cityRegistry.findUnique({
          where: {
            id: parsed.data.registryId,
          },
          select: {
            id: true,
          },
        });

        if (!registry) {
          return reply.code(404).send({
            status: "error",
            error: "City registry entry not found",
          });
        }
      }

      try {
        const updatedCity = await prisma.$transaction(async (tx) => {
          await tx.city.update({
            where: {
              id: city.id,
            },
            data: buildCityUpdateData(parsed.data),
          });

          await tx.auditLog.create({
            data: {
              actorUserId: auth.user.id,
              action: "platform.city.updated",
              targetType: "city",
              targetId: city.id,
              scopeType: "city",
              cityId: city.id,
              metadataJson: {
                previousSlug: city.slug,
                nextSlug: hasOwn(parsed.data, "slug")
                  ? slugify(parsed.data.slug ?? city.slug)
                  : city.slug,
                fields: Object.keys(parsed.data).sort(),
              },
            },
          });

          return tx.city.findUniqueOrThrow({
            where: {
              id: city.id,
            },
            include: {
              _count: {
                select: {
                  businesses: true,
                  categories: {
                    where: {
                      active: true,
                    },
                  },
                },
              },
            },
          });
        });

        return reply.send({
          status: "ok",
          item: mapCity(updatedCity),
        });
      } catch (error) {
        if (isPrismaError(error, "P2002")) {
          return reply.code(409).send({
            status: "error",
            error: "A city with the same slug or registry reference already exists.",
          });
        }

        throw error;
      }
    },
  );

  app.get(
    "/api/v2/platform-core/businesses",
    { preHandler: requirePermission("businesses.read") },
    async (request, reply) => {
      const parsed = parsePayload(listBusinessesQuerySchema, request.query);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const where: Prisma.BusinessWhereInput = {
        ...buildAccessibleBusinessFilter(auth),
        status: parsed.data.status,
        city: parsed.data.citySlug
          ? {
              slug: parsed.data.citySlug,
            }
          : undefined,
        template: parsed.data.templateCode ? { code: parsed.data.templateCode } : undefined,
        ...(parsed.data.q
          ? {
              OR: [
                { name: { contains: parsed.data.q, mode: "insensitive" as const } },
                { slug: { contains: slugify(parsed.data.q) } },
                { legalName: { contains: parsed.data.q, mode: "insensitive" as const } },
                {
                  ownerUser: {
                    is: { email: { contains: parsed.data.q, mode: "insensitive" as const } },
                  },
                },
              ],
            }
          : {}),
      };
      const [businesses, total] = await prisma.$transaction([
        prisma.business.findMany({
          where,
          orderBy: [{ createdAt: "desc" }],
          skip: (parsed.data.page - 1) * parsed.data.limit,
          take: parsed.data.limit,
          include: {
            city: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                active: true,
              },
            },
            template: {
              select: {
                id: true,
                code: true,
                name: true,
                category: true,
                primaryModule: true,
                defaultCtaLabel: true,
              },
            },
            modules: {
              orderBy: {
                moduleCode: "asc",
              },
              select: {
                moduleCode: true,
                active: true,
              },
            },
            ownerUser: {
              select: {
                id: true,
                email: true,
                name: true,
                status: true,
              },
            },
          },
        }),
        prisma.business.count({ where }),
      ]);

      return {
        status: "ok",
        items: businesses.map(mapBusiness),
        page: parsed.data.page,
        limit: parsed.data.limit,
        total,
        totalPages: Math.ceil(total / parsed.data.limit),
      };
    },
  );

  app.post(
    "/api/v2/platform-core/businesses",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = parsePayload(createBusinessSchema, request.body);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      if (parsed.data.status === "active") {
        return reply.code(400).send({
          status: "error",
          error: "Create businesses as draft and use the publish endpoint after readiness checks.",
        });
      }

      const auth = getRequestAuth(request);
      const city = await prisma.city.findUnique({
        where: {
          slug: parsed.data.citySlug,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      });

      if (!city) {
        return reply.code(404).send({
          status: "error",
          error: "City not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "businesses.manage", {
          scopeType: "city",
          cityId: city.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      if (
        (parsed.data.plan !== "free" || parsed.data.subscriptionStatus !== "trialing") &&
        !canAccess(auth.activeAccess, "platform.manage", { scopeType: "platform" })
      ) {
        return reply.code(403).send({ status: "error", error: "Insufficient permissions" });
      }

      const normalizedBusinessSlug = slugify(parsed.data.slug ?? parsed.data.name);
      if (!normalizedBusinessSlug) {
        return reply.code(400).send({ status: "error", error: "Business slug cannot be empty" });
      }

      const assetIds = [parsed.data.logoAssetId, parsed.data.coverAssetId].filter(
        (value): value is string => typeof value === "string",
      );
      if (assetIds.length > 0) {
        const validAssets = await prisma.mediaAsset.count({
          where: { id: { in: assetIds }, cityId: city.id },
        });
        if (validAssets !== new Set(assetIds).size) {
          return reply.code(400).send({
            status: "error",
            error: "Logo and cover assets must belong to the selected city.",
          });
        }
      }

      const template = await ensureTemplateRecord(parsed.data.templateCode);
      const definition = templateCatalogMap.get(parsed.data.templateCode);

      if (!definition) {
        return reply.code(400).send({
          status: "error",
          error: "Template catalog definition not found",
        });
      }

      const requestedModules = parsed.data.modules ?? [];
      const moduleSet = new Set<ModuleCode>([definition.primaryModule, ...requestedModules]);

      try {
        const business = await prisma.$transaction(async (tx) => {
          let ownerUserId: string | null = null;

          if (parsed.data.ownerEmail) {
            const existingOwner = await tx.user.findUnique({
              where: {
                email: parsed.data.ownerEmail,
              },
              select: {
                id: true,
                passwordHash: true,
                status: true,
              },
            });

            if (existingOwner) {
              if (existingOwner.status === "disabled") throw new Error("OWNER_DISABLED");
              ownerUserId = existingOwner.id;
              if (parsed.data.ownerPassword && !existingOwner.passwordHash) {
                await tx.user.update({
                  where: { id: existingOwner.id },
                  data: {
                    passwordHash: hashPassword(parsed.data.ownerPassword),
                    status: "active",
                    authVersion: { increment: 1 },
                  },
                });
              } else if (existingOwner.status === "invited" && existingOwner.passwordHash) {
                await tx.user.update({
                  where: { id: existingOwner.id },
                  data: { status: "active" },
                });
              }
            } else {
              const createdOwner = await tx.user.create({
                data: {
                  email: parsed.data.ownerEmail,
                  name: normalizeOptionalString(parsed.data.ownerName),
                  phone: normalizeOptionalString(parsed.data.ownerPhone),
                  status: parsed.data.ownerPassword ? "active" : "invited",
                  passwordHash: parsed.data.ownerPassword
                    ? hashPassword(parsed.data.ownerPassword)
                    : null,
                },
                select: {
                  id: true,
                },
              });

              ownerUserId = createdOwner.id;
            }
          }

          const createdBusiness = await tx.business.create({
            data: {
              cityId: city.id,
              templateId: template.id,
              name: parsed.data.name,
              slug: normalizedBusinessSlug,
              legalName: normalizeOptionalString(parsed.data.legalName),
              category: parsed.data.category ?? definition.category,
              status: parsed.data.status,
              plan: parsed.data.plan,
              subscriptionStatus: parsed.data.subscriptionStatus,
              publicEmail: parsed.data.publicEmail ?? null,
              publicPhone: normalizeOptionalString(parsed.data.publicPhone),
              website: parsed.data.website ?? null,
              addressLine1: normalizeOptionalString(parsed.data.addressLine1),
              addressLine2: normalizeOptionalString(parsed.data.addressLine2),
              postalCode: normalizeOptionalString(parsed.data.postalCode),
              locality: normalizeOptionalString(parsed.data.locality),
              province: normalizeOptionalString(parsed.data.province),
              lat: parsed.data.lat ?? null,
              lng: parsed.data.lng ?? null,
              timezone: parsed.data.timezone ?? "Europe/Rome",
              currency: parsed.data.currency ?? "EUR",
              locale: parsed.data.locale ?? "it-IT",
              ownerUserId,
              primaryColor: normalizeColor(parsed.data.primaryColor),
              accentColor: normalizeColor(parsed.data.accentColor),
              publicTitle: normalizeOptionalString(parsed.data.publicTitle),
              publicSubtitle: normalizeOptionalString(parsed.data.publicSubtitle),
              publicDescription: normalizeOptionalString(parsed.data.publicDescription),
              seoTitle: normalizeOptionalString(parsed.data.seoTitle),
              seoDescription: normalizeOptionalString(parsed.data.seoDescription),
              bookingPolicy: normalizeOptionalString(parsed.data.bookingPolicy),
              cancellationPolicy: normalizeOptionalString(parsed.data.cancellationPolicy),
              notesInternal: normalizeOptionalString(parsed.data.notesInternal),
              privacyContactEmail: parsed.data.privacyContactEmail ?? null,
              socialLinksJson: parsed.data.socialLinks ?? Prisma.JsonNull,
              logoAssetId: parsed.data.logoAssetId ?? null,
              coverAssetId: parsed.data.coverAssetId ?? null,
            },
            include: {
              city: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                  active: true,
                },
              },
              template: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  category: true,
                  primaryModule: true,
                  defaultCtaLabel: true,
                },
              },
              ownerUser: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  status: true,
                },
              },
              modules: {
                select: {
                  moduleCode: true,
                  active: true,
                },
              },
            },
          });

          if (moduleSet.size > 0) {
            await tx.businessModule.createMany({
              data: [...moduleSet].map((moduleCode) => ({
                businessId: createdBusiness.id,
                moduleCode,
                active: true,
              })),
            });
          }

          if (ownerUserId) {
            await tx.accessGrant.create({
              data: {
                userId: ownerUserId,
                role: "local_admin",
                scopeType: "business",
                cityId: city.id,
                businessId: createdBusiness.id,
                active: true,
                createdByUserId: auth.user.id,
              },
            });
          }

          await tx.auditLog.create({
            data: {
              actorUserId: auth.user.id,
              action: "platform.business.created",
              targetType: "business",
              targetId: createdBusiness.id,
              scopeType: "business",
              cityId: city.id,
              businessId: createdBusiness.id,
              metadataJson: {
                citySlug: city.slug,
                templateCode: template.code,
                moduleCodes: [...moduleSet],
                ownerUserId,
              },
            },
          });

          return tx.business.findUniqueOrThrow({
            where: {
              id: createdBusiness.id,
            },
            include: {
              city: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                  active: true,
                },
              },
              template: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  category: true,
                  primaryModule: true,
                  defaultCtaLabel: true,
                },
              },
              modules: {
                orderBy: {
                  moduleCode: "asc",
                },
                select: {
                  moduleCode: true,
                  active: true,
                },
              },
              ownerUser: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  status: true,
                },
              },
            },
          });
        });

        return reply.code(201).send({
          status: "ok",
          item: mapBusiness(business),
        });
      } catch (error) {
        if (error instanceof Error && error.message === "OWNER_DISABLED") {
          return reply.code(409).send({
            status: "error",
            error: "The owner account is disabled. Reactivate it through access management first.",
          });
        }
        if (isPrismaError(error, "P2002")) {
          return reply.code(409).send({
            status: "error",
            error: "A business with the same slug already exists in this city.",
          });
        }

        throw error;
      }
    },
  );

  app.get(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug",
    { preHandler: requirePermission("businesses.read") },
    async (request, reply) => {
      const params = parsePayload(publicBusinessParamsSchema, request.params);

      if (!params.success) {
        return reply.code(params.response.statusCode).send(params.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await prisma.business.findFirst({
        where: {
          ...buildAccessibleBusinessFilter(auth),
          slug: params.data.businessSlug,
          city: { slug: params.data.citySlug },
        },
        include: {
          city: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              active: true,
            },
          },
          template: {
            select: {
              id: true,
              code: true,
              name: true,
              category: true,
              primaryModule: true,
              defaultCtaLabel: true,
            },
          },
          modules: {
            orderBy: { moduleCode: "asc" },
            select: {
              moduleCode: true,
              active: true,
            },
          },
          ownerUser: {
            select: {
              id: true,
              email: true,
              name: true,
              status: true,
            },
          },
        },
      });

      if (!business) {
        return reply.code(404).send({ status: "error", error: "Business not found" });
      }

      return reply.send({ status: "ok", item: mapBusiness(business) });
    },
  );

  app.patch(
    "/api/v2/platform-core/cities/:citySlug/businesses/:businessSlug",
    { preHandler: requirePermission("businesses.manage") },
    async (request, reply) => {
      const params = parsePayload(publicBusinessParamsSchema, request.params);
      const parsed = parsePayload(updateBusinessSchema, request.body);

      if (!params.success) {
        return reply.code(params.response.statusCode).send(params.response.body);
      }

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      if (Object.keys(parsed.data).length === 0) {
        return reply.code(400).send({
          status: "error",
          error: "No fields to update",
        });
      }

      const auth = getRequestAuth(request);
      const business = await prisma.business.findFirst({
        where: {
          slug: params.data.businessSlug,
          city: {
            slug: params.data.citySlug,
          },
        },
        select: {
          id: true,
          slug: true,
          status: true,
          ownerUserId: true,
          city: {
            select: {
              id: true,
              slug: true,
            },
          },
        },
      });

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "businesses.manage", {
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

      if (hasOwn(parsed.data, "status")) {
        return reply.code(400).send({
          status: "error",
          error: "Business status must be changed through the publish workflow.",
        });
      }

      if (
        (hasOwn(parsed.data, "plan") || hasOwn(parsed.data, "subscriptionStatus")) &&
        !canAccess(auth.activeAccess, "platform.manage", { scopeType: "platform" })
      ) {
        return reply.code(403).send({ status: "error", error: "Insufficient permissions" });
      }

      const includesOwnerFields =
        hasOwn(parsed.data, "ownerEmail") ||
        hasOwn(parsed.data, "ownerName") ||
        hasOwn(parsed.data, "ownerPhone");
      if (
        includesOwnerFields &&
        !canAccess(auth.activeAccess, "business_users.manage", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({ status: "error", error: "Insufficient permissions" });
      }

      if (hasOwn(parsed.data, "slug") && parsed.data.slug && !slugify(parsed.data.slug)) {
        return reply.code(400).send({ status: "error", error: "Business slug cannot be empty" });
      }

      if (hasOwn(parsed.data, "slug") && parsed.data.slug && business.status === "active") {
        return reply.code(409).send({
          status: "error",
          error: "Published business slugs cannot be changed. Unpublish first.",
        });
      }

      const assetIds = [parsed.data.logoAssetId, parsed.data.coverAssetId].filter(
        (value): value is string => typeof value === "string",
      );

      if (assetIds.length > 0) {
        const validAssets = await prisma.mediaAsset.count({
          where: {
            id: { in: assetIds },
            OR: [{ businessId: business.id }, { cityId: business.city.id }],
          },
        });

        if (validAssets !== new Set(assetIds).size) {
          return reply.code(400).send({
            status: "error",
            error: "Logo and cover assets must belong to the current business or city.",
          });
        }
      }

      if (business.status === "active") {
        const current = await prisma.business.findUniqueOrThrow({
          where: { id: business.id },
          include: {
            city: true,
            categoryAssignments: { where: { category: { active: true } } },
          },
        });
        const readiness = getBusinessPublishReadiness({
          name: parsed.data.name ?? current.name,
          slug: parsed.data.slug ? slugify(parsed.data.slug) : current.slug,
          cityStatus: current.city.status,
          cityActive: current.city.active,
          publicSubtitle: hasOwn(parsed.data, "publicSubtitle")
            ? (parsed.data.publicSubtitle ?? null)
            : current.publicSubtitle,
          publicDescription: hasOwn(parsed.data, "publicDescription")
            ? (parsed.data.publicDescription ?? null)
            : current.publicDescription,
          publicEmail: hasOwn(parsed.data, "publicEmail")
            ? (parsed.data.publicEmail ?? null)
            : current.publicEmail,
          publicPhone: hasOwn(parsed.data, "publicPhone")
            ? (parsed.data.publicPhone ?? null)
            : current.publicPhone,
          website: hasOwn(parsed.data, "website") ? (parsed.data.website ?? null) : current.website,
          activeCategoryCount: current.categoryAssignments.length,
        });
        if (!readiness.canPublish) {
          return reply.code(409).send({
            status: "error",
            error: "Published business updates must preserve publish readiness.",
            ...readiness,
          });
        }
      }

      try {
        const updatedBusiness = await prisma.$transaction(async (tx) => {
          let ownerUserId: string | null | undefined;

          if (hasOwn(parsed.data, "ownerEmail")) {
            if (!parsed.data.ownerEmail) {
              ownerUserId = null;
            } else {
              const existingOwner = await tx.user.findUnique({
                where: {
                  email: parsed.data.ownerEmail,
                },
                select: {
                  id: true,
                  passwordHash: true,
                  status: true,
                },
              });

              if (existingOwner) {
                ownerUserId = existingOwner.id;
                if (existingOwner.status === "disabled") throw new Error("OWNER_DISABLED");

                if (existingOwner.status === "invited" && existingOwner.passwordHash) {
                  await tx.user.update({
                    where: { id: existingOwner.id },
                    data: { status: "active" },
                  });
                }

                if (hasOwn(parsed.data, "ownerName") || hasOwn(parsed.data, "ownerPhone")) {
                  await tx.user.update({
                    where: {
                      id: existingOwner.id,
                    },
                    data: {
                      ...(hasOwn(parsed.data, "ownerName")
                        ? { name: normalizeOptionalString(parsed.data.ownerName) }
                        : {}),
                      ...(hasOwn(parsed.data, "ownerPhone")
                        ? { phone: normalizeOptionalString(parsed.data.ownerPhone) }
                        : {}),
                    },
                  });
                }
              } else {
                const createdOwner = await tx.user.create({
                  data: {
                    email: parsed.data.ownerEmail,
                    name: normalizeOptionalString(parsed.data.ownerName),
                    phone: normalizeOptionalString(parsed.data.ownerPhone),
                    status: "invited",
                  },
                  select: {
                    id: true,
                  },
                });

                ownerUserId = createdOwner.id;
              }
            }
          }

          await tx.business.update({
            where: {
              id: business.id,
            },
            data: {
              ...buildBusinessUpdateData(parsed.data),
              ...(ownerUserId !== undefined
                ? {
                    ownerUser: ownerUserId
                      ? {
                          connect: {
                            id: ownerUserId,
                          },
                        }
                      : {
                          disconnect: true,
                        },
                  }
                : {}),
            },
          });

          if (
            ownerUserId !== undefined &&
            business.ownerUserId &&
            business.ownerUserId !== ownerUserId
          ) {
            await tx.accessGrant.updateMany({
              where: {
                userId: business.ownerUserId,
                role: "local_admin",
                scopeType: "business",
                businessId: business.id,
                active: true,
              },
              data: { active: false },
            });
          }

          if (ownerUserId) {
            const ownerGrant = await tx.accessGrant.findFirst({
              where: {
                userId: ownerUserId,
                role: "local_admin",
                scopeType: "business",
                cityId: business.city.id,
                businessId: business.id,
              },
              select: {
                id: true,
                active: true,
              },
            });

            if (!ownerGrant) {
              await tx.accessGrant.create({
                data: {
                  userId: ownerUserId,
                  role: "local_admin",
                  scopeType: "business",
                  cityId: business.city.id,
                  businessId: business.id,
                  active: true,
                  createdByUserId: auth.user.id,
                },
              });
            } else if (!ownerGrant.active) {
              await tx.accessGrant.update({
                where: {
                  id: ownerGrant.id,
                },
                data: {
                  active: true,
                },
              });
            }
          }

          await tx.auditLog.create({
            data: {
              actorUserId: auth.user.id,
              action: "platform.business.updated",
              targetType: "business",
              targetId: business.id,
              scopeType: "business",
              cityId: business.city.id,
              businessId: business.id,
              metadataJson: {
                citySlug: business.city.slug,
                previousSlug: business.slug,
                nextSlug: hasOwn(parsed.data, "slug")
                  ? slugify(parsed.data.slug ?? business.slug)
                  : business.slug,
                ownerUserId: ownerUserId ?? undefined,
                fields: Object.keys(parsed.data).sort(),
              },
            },
          });

          return tx.business.findUniqueOrThrow({
            where: {
              id: business.id,
            },
            include: {
              city: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                  active: true,
                },
              },
              template: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  category: true,
                  primaryModule: true,
                  defaultCtaLabel: true,
                },
              },
              modules: {
                orderBy: {
                  moduleCode: "asc",
                },
                select: {
                  moduleCode: true,
                  active: true,
                },
              },
              ownerUser: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  status: true,
                },
              },
            },
          });
        });

        return reply.send({
          status: "ok",
          item: mapBusiness(updatedBusiness),
        });
      } catch (error) {
        if (error instanceof Error && error.message === "OWNER_DISABLED") {
          return reply.code(409).send({
            status: "error",
            error: "The owner account is disabled. Reactivate it through access management first.",
          });
        }
        if (isPrismaError(error, "P2002")) {
          return reply.code(409).send({
            status: "error",
            error: "A business with the same slug already exists in this city.",
          });
        }

        throw error;
      }
    },
  );

  app.get(
    "/api/v2/platform-core/access-grants",
    { preHandler: requirePermission("business_users.manage") },
    async (request, reply) => {
      const parsed = parsePayload(listAccessGrantsQuerySchema, request.query);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const where: Prisma.AccessGrantWhereInput = {
        role: parsed.data.role,
        scopeType: parsed.data.scopeType,
        active: parsed.data.active,
        user: parsed.data.q
          ? {
              OR: [
                { email: { contains: parsed.data.q, mode: "insensitive" } },
                { name: { contains: parsed.data.q, mode: "insensitive" } },
              ],
            }
          : parsed.data.userEmail
            ? { email: parsed.data.userEmail }
            : undefined,
        ...buildAccessibleAccessGrantFilter(auth),
        city:
          parsed.data.citySlug && !parsed.data.businessSlug
            ? {
                slug: parsed.data.citySlug,
              }
            : undefined,
        business: parsed.data.businessSlug
          ? {
              slug: parsed.data.businessSlug,
              city: parsed.data.citySlug
                ? {
                    slug: parsed.data.citySlug,
                  }
                : undefined,
            }
          : undefined,
      };
      const [grants, total] = await prisma.$transaction([
        prisma.accessGrant.findMany({
          where,
          orderBy: [{ createdAt: "desc" }],
          skip: (parsed.data.page - 1) * parsed.data.limit,
          take: parsed.data.limit,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                status: true,
                lastLoginAt: true,
              },
            },
            city: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
              },
            },
            business: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                city: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    status: true,
                  },
                },
              },
            },
          },
        }),
        prisma.accessGrant.count({ where }),
      ]);

      return reply.send({
        status: "ok",
        items: grants.map(mapAccessGrant),
        page: parsed.data.page,
        limit: parsed.data.limit,
        total,
        totalPages: Math.ceil(total / parsed.data.limit),
      });
    },
  );

  app.get(
    "/api/v2/platform-core/audit-logs",
    { preHandler: requirePermission("platform.read") },
    async (request, reply) => {
      const parsed = parsePayload(listAuditLogsQuerySchema, request.query);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const toExclusive = parsed.data.to ? new Date(parsed.data.to) : null;
      if (toExclusive) toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
      const where: Prisma.AuditLogWhereInput = {
        action: parsed.data.action
          ? {
              contains: parsed.data.action,
              mode: "insensitive",
            }
          : undefined,
        targetType: parsed.data.targetType
          ? {
              equals: parsed.data.targetType,
              mode: "insensitive",
            }
          : undefined,
        scopeType: parsed.data.scopeType,
        createdAt:
          parsed.data.from || toExclusive
            ? { gte: parsed.data.from, lt: toExclusive ?? undefined }
            : undefined,
        city:
          parsed.data.citySlug && !parsed.data.businessSlug
            ? {
                slug: parsed.data.citySlug,
              }
            : undefined,
        business: parsed.data.businessSlug
          ? {
              slug: parsed.data.businessSlug,
              city: parsed.data.citySlug
                ? {
                    slug: parsed.data.citySlug,
                  }
                : undefined,
            }
          : undefined,
        ...buildAccessibleAuditLogFilter(auth),
        ...(parsed.data.q
          ? {
              OR: [
                { action: { contains: parsed.data.q, mode: "insensitive" as const } },
                { targetType: { contains: parsed.data.q, mode: "insensitive" as const } },
                {
                  actorUser: {
                    is: {
                      OR: [
                        { email: { contains: parsed.data.q, mode: "insensitive" as const } },
                        { name: { contains: parsed.data.q, mode: "insensitive" as const } },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
      };
      const [logs, total] = await prisma.$transaction([
        prisma.auditLog.findMany({
          where,
          orderBy: [{ createdAt: "desc" }],
          skip: (parsed.data.page - 1) * parsed.data.limit,
          take: parsed.data.limit,
          include: {
            actorUser: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
            city: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
              },
            },
            business: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                city: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    status: true,
                  },
                },
              },
            },
          },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return reply.send({
        status: "ok",
        items: logs.map(mapAuditLog),
        page: parsed.data.page,
        limit: parsed.data.limit,
        total,
        totalPages: Math.ceil(total / parsed.data.limit),
      });
    },
  );

  app.post(
    "/api/v2/platform-core/access-grants",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = parsePayload(createAccessGrantSchema, request.body);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const city =
        parsed.data.citySlug != null
          ? await prisma.city.findUnique({
              where: {
                slug: parsed.data.citySlug,
              },
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
              },
            })
          : null;

      if (parsed.data.citySlug && !city) {
        return reply.code(404).send({
          status: "error",
          error: "City not found",
        });
      }

      const business =
        parsed.data.businessSlug != null
          ? await prisma.business.findFirst({
              where: {
                slug: parsed.data.businessSlug,
                city: parsed.data.citySlug
                  ? {
                      slug: parsed.data.citySlug,
                    }
                  : undefined,
              },
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                city: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    status: true,
                  },
                },
              },
            })
          : null;

      if (parsed.data.businessSlug && !business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      const permissionContext =
        parsed.data.scopeType === "platform"
          ? { scopeType: "platform" as const }
          : parsed.data.scopeType === "city"
            ? { scopeType: "city" as const, cityId: city?.id ?? null }
            : {
                scopeType: "business" as const,
                cityId: business?.city.id ?? city?.id ?? null,
                businessId: business?.id ?? null,
              };

      if (!canAccess(auth.activeAccess, "business_users.manage", permissionContext)) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const cityId = business?.city.id ?? city?.id ?? null;
      const businessId = business?.id ?? null;

      try {
        const accessGrant = await prisma.$transaction(async (tx) => {
          let userId = parsed.data.userId ?? null;

          if (userId) {
            const existingUser = await tx.user.findUnique({
              where: {
                id: userId,
              },
              select: {
                id: true,
              },
            });

            if (!existingUser) {
              throw new Error("USER_NOT_FOUND");
            }
          } else if (parsed.data.userEmail) {
            const existingUser = await tx.user.findUnique({
              where: {
                email: parsed.data.userEmail,
              },
              select: {
                id: true,
                status: true,
                passwordHash: true,
              },
            });

            if (existingUser) {
              userId = existingUser.id;

              if (parsed.data.password && !existingUser.passwordHash) {
                await tx.user.update({
                  where: {
                    id: existingUser.id,
                  },
                  data: {
                    name: normalizeOptionalString(parsed.data.userName),
                    phone: normalizeOptionalString(parsed.data.userPhone),
                    status: "active",
                    passwordHash: hashPassword(parsed.data.password),
                    authVersion: { increment: 1 },
                  },
                });
              }
            } else {
              const createdUser = await tx.user.create({
                data: {
                  email: parsed.data.userEmail,
                  name: normalizeOptionalString(parsed.data.userName),
                  phone: normalizeOptionalString(parsed.data.userPhone),
                  status: parsed.data.password ? "active" : parsed.data.userStatus,
                  passwordHash: parsed.data.password ? hashPassword(parsed.data.password) : null,
                },
                select: {
                  id: true,
                },
              });

              userId = createdUser.id;
            }
          }

          if (!userId) {
            throw new Error("USER_NOT_RESOLVED");
          }

          const duplicate = await tx.accessGrant.findFirst({
            where: {
              userId,
              role: parsed.data.role,
              scopeType: parsed.data.scopeType,
              cityId,
              businessId,
            },
            select: {
              id: true,
            },
          });

          if (duplicate) {
            throw new Error("DUPLICATE_ACCESS_GRANT");
          }

          const createdGrant = await tx.accessGrant.create({
            data: {
              userId,
              role: parsed.data.role,
              scopeType: parsed.data.scopeType,
              cityId,
              businessId,
              active: parsed.data.active,
              createdByUserId: auth.user.id,
            },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  phone: true,
                  status: true,
                  lastLoginAt: true,
                },
              },
              city: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                },
              },
              business: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                  city: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      status: true,
                    },
                  },
                },
              },
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: auth.user.id,
              action: "platform.access_grant.created",
              targetType: "access_grant",
              targetId: createdGrant.id,
              scopeType: parsed.data.scopeType,
              cityId,
              businessId,
              metadataJson: {
                role: parsed.data.role,
                userId,
              },
            },
          });

          return createdGrant;
        });

        return reply.code(201).send({
          status: "ok",
          item: mapAccessGrant(accessGrant),
        });
      } catch (error) {
        if (error instanceof Error && error.message === "USER_NOT_FOUND") {
          return reply.code(404).send({
            status: "error",
            error: "User not found",
          });
        }

        if (error instanceof Error && error.message === "USER_NOT_RESOLVED") {
          return reply.code(400).send({
            status: "error",
            error: "Unable to resolve the target user",
          });
        }

        if (error instanceof Error && error.message === "DUPLICATE_ACCESS_GRANT") {
          return reply.code(409).send({
            status: "error",
            error: "This user already has the requested access grant",
          });
        }

        throw error;
      }
    },
  );

  app.patch(
    "/api/v2/platform-core/access-grants/:accessGrantId",
    { preHandler: requirePermission("business_users.manage") },
    async (request, reply) => {
      const params = parsePayload(accessGrantParamsSchema, request.params);
      const parsed = parsePayload(updateAccessGrantSchema, request.body);

      if (!params.success) {
        return reply.code(params.response.statusCode).send(params.response.body);
      }

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      if (Object.keys(parsed.data).length === 0) {
        return reply.code(400).send({
          status: "error",
          error: "No fields to update",
        });
      }

      const auth = getRequestAuth(request);
      const grant = await prisma.accessGrant.findUnique({
        where: {
          id: params.data.accessGrantId,
        },
        select: {
          id: true,
          userId: true,
          active: true,
          scopeType: true,
          cityId: true,
          businessId: true,
        },
      });

      if (!grant) {
        return reply.code(404).send({
          status: "error",
          error: "Access grant not found",
        });
      }

      const permissionContext =
        grant.scopeType === "platform"
          ? { scopeType: "platform" as const }
          : grant.scopeType === "city"
            ? { scopeType: "city" as const, cityId: grant.cityId }
            : {
                scopeType: "business" as const,
                cityId: grant.cityId,
                businessId: grant.businessId,
              };

      if (!canAccess(auth.activeAccess, "business_users.manage", permissionContext)) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const updatedGrant = await prisma.$transaction(async (tx) => {
        if (parsed.data.temporaryPassword) {
          await tx.user.update({
            where: { id: grant.userId },
            data: {
              status: "active",
              passwordHash: hashPassword(parsed.data.temporaryPassword),
              authVersion: { increment: 1 },
            },
          });
        }

        const nextGrant = await tx.accessGrant.update({
          where: {
            id: grant.id,
          },
          data: {
            ...(hasOwn(parsed.data, "active") ? { active: parsed.data.active } : {}),
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                status: true,
                lastLoginAt: true,
              },
            },
            city: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
              },
            },
            business: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                city: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    status: true,
                  },
                },
              },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: auth.user.id,
            action: "platform.access_grant.updated",
            targetType: "access_grant",
            targetId: grant.id,
            scopeType: grant.scopeType,
            cityId: grant.cityId,
            businessId: grant.businessId,
            metadataJson: {
              previousActive: grant.active,
              nextActive: parsed.data.active,
              temporaryPasswordRotated: Boolean(parsed.data.temporaryPassword),
              fields: Object.keys(parsed.data).sort(),
            },
          },
        });

        return nextGrant;
      });

      return reply.send({
        status: "ok",
        item: mapAccessGrant(updatedGrant),
      });
    },
  );
}
