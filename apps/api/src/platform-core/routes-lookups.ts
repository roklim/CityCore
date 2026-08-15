import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getRequestAuth, requirePermission } from "../auth.js";
import { prisma } from "../database.js";
import { buildAccessibleBusinessFilter, buildAccessibleCityFilter } from "./access.js";
import { mapCityRegistryEntry } from "./mappers.js";
import { parsePayload } from "./utils.js";

const optionalBoolean = z
  .union([z.boolean(), z.enum(["true", "false"]).transform((value) => value === "true")])
  .optional();

const cityLookupQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  ready: optionalBoolean.default(false),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

const businessLookupQuerySchema = z.object({
  q: z.string().trim().max(160).optional().default(""),
  citySlug: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

const registryLookupQuerySchema = z.object({
  q: z.string().trim().max(160).optional().default(""),
  country: z.string().trim().length(2).optional(),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

function normalizeLookupQuery(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function registryRank(entry: { name: string; asciiName: string | null }, query: string) {
  const normalizedName = normalizeLookupQuery(entry.name);
  const normalizedAsciiName = normalizeLookupQuery(entry.asciiName ?? "");
  if (normalizedName === query || normalizedAsciiName === query) return 0;
  if (normalizedName.startsWith(query) || normalizedAsciiName.startsWith(query)) return 1;
  return 2;
}

export function registerPlatformLookupRoutes(app: FastifyInstance) {
  app.get(
    "/api/v2/platform-core/lookups/cities",
    { preHandler: requirePermission("cities.read") },
    async (request, reply) => {
      const parsed = parsePayload(cityLookupQuerySchema, request.query);
      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const where: Prisma.CityWhereInput = {
        ...buildAccessibleCityFilter(auth),
        ...(parsed.data.ready
          ? {
              active: true,
              status: "active",
              categories: { some: { active: true } },
            }
          : {}),
        ...(parsed.data.q
          ? {
              OR: [
                { name: { contains: parsed.data.q, mode: "insensitive" as const } },
                { slug: { contains: parsed.data.q.toLowerCase() } },
                { province: { contains: parsed.data.q, mode: "insensitive" as const } },
                { region: { contains: parsed.data.q, mode: "insensitive" as const } },
                { country: { equals: parsed.data.q.toUpperCase() } },
              ],
            }
          : {}),
      };

      const cities = await prisma.city.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: parsed.data.limit,
        include: {
          registry: {
            select: {
              externalId: true,
              timezone: true,
              countryName: true,
              admin1Name: true,
              admin2Name: true,
            },
          },
          _count: {
            select: {
              categories: { where: { active: true } },
              businesses: true,
            },
          },
        },
      });

      return reply.send({
        status: "ok",
        items: cities.map((city) => ({
          id: city.id,
          name: city.name,
          slug: city.slug,
          province: city.province,
          region: city.region,
          country: city.country,
          status: city.status,
          active: city.active,
          timezone: city.registry?.timezone ?? null,
          registryExternalId: city.registry?.externalId ?? null,
          countryName: city.registry?.countryName ?? null,
          admin1Name: city.registry?.admin1Name ?? null,
          admin2Name: city.registry?.admin2Name ?? null,
          activeCategoryCount: city._count.categories,
          businessCount: city._count.businesses,
        })),
      });
    },
  );

  app.get(
    "/api/v2/platform-core/lookups/businesses",
    { preHandler: requirePermission("businesses.read") },
    async (request, reply) => {
      const parsed = parsePayload(businessLookupQuerySchema, request.query);
      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const where: Prisma.BusinessWhereInput = {
        ...buildAccessibleBusinessFilter(auth),
        ...(parsed.data.citySlug ? { city: { slug: parsed.data.citySlug } } : {}),
        ...(parsed.data.q
          ? {
              OR: [
                { name: { contains: parsed.data.q, mode: "insensitive" as const } },
                { slug: { contains: parsed.data.q.toLowerCase() } },
                { legalName: { contains: parsed.data.q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };

      const businesses = await prisma.business.findMany({
        where,
        orderBy: [{ name: "asc" }],
        take: parsed.data.limit,
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
              active: true,
            },
          },
        },
      });

      return reply.send({ status: "ok", items: businesses });
    },
  );

  app.get(
    "/api/v2/platform-core/lookups/city-registry",
    { preHandler: requirePermission("platform.read", () => ({ scopeType: "platform" })) },
    async (request, reply) => {
      const parsed = parsePayload(registryLookupQuerySchema, request.query);
      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const normalizedQuery = normalizeLookupQuery(parsed.data.q);
      const where: Prisma.CityRegistryWhereInput = {
        activeMunicipality: true,
        ...(parsed.data.country ? { country: parsed.data.country.toUpperCase() } : {}),
        ...(normalizedQuery
          ? {
              OR: [
                { searchText: { startsWith: normalizedQuery } },
                { name: { startsWith: parsed.data.q, mode: "insensitive" as const } },
                { asciiName: { startsWith: parsed.data.q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };

      const entries = await prisma.cityRegistry.findMany({
        where,
        orderBy: [{ population: "desc" }, { name: "asc" }],
        take: Math.min(parsed.data.limit * 3, 100),
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
      });

      const ranked = normalizedQuery
        ? [...entries].sort((left, right) => {
            const rankDifference = registryRank(left, normalizedQuery) - registryRank(right, normalizedQuery);
            if (rankDifference) return rankDifference;
            return (right.population ?? 0) - (left.population ?? 0) || left.name.localeCompare(right.name);
          })
        : entries;

      return reply.send({
        status: "ok",
        items: ranked.slice(0, parsed.data.limit).map(mapCityRegistryEntry),
      });
    },
  );
}
