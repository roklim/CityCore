import type { FastifyInstance } from "fastify";

import { prisma } from "../database.js";
import {
  publicBusinessParamsSchema,
  publicCityParamsSchema,
  publicListBusinessesQuerySchema,
  publicListCitiesQuerySchema,
} from "./config.js";
import { mapPublicBusiness, mapPublicCity } from "./mappers.js";
import { parsePayload } from "./utils.js";

export function registerPublicPlatformRoutes(app: FastifyInstance) {
  app.get("/api/v2/public", async () => ({
    status: "ok",
    area: "public-catalog",
    capabilities: {
      cities: ["/api/v2/public/cities", "/api/v2/public/cities/:citySlug"],
      businesses: [
        "/api/v2/public/businesses",
        "/api/v2/public/cities/:citySlug/businesses",
        "/api/v2/public/cities/:citySlug/businesses/:businessSlug",
      ],
    },
  }));

  app.get("/api/v2/public/cities", async (request, reply) => {
    const parsed = parsePayload(publicListCitiesQuerySchema, request.query);

    if (!parsed.success) {
      return reply.code(parsed.response.statusCode).send(parsed.response.body);
    }

    const cities = await prisma.city.findMany({
      where: {
        active: true,
        status: {
          not: "disabled",
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: parsed.data.limit,
      include: {
        businesses: {
          where: {
            status: "active",
          },
          select: {
            id: true,
          },
        },
      },
    });

    return reply.send({
      status: "ok",
      items: cities.map(mapPublicCity),
    });
  });

  app.get("/api/v2/public/cities/:citySlug", async (request, reply) => {
    const parsed = parsePayload(publicCityParamsSchema, request.params);

    if (!parsed.success) {
      return reply.code(parsed.response.statusCode).send(parsed.response.body);
    }

    const city = await prisma.city.findFirst({
      where: {
        slug: parsed.data.citySlug,
        active: true,
        status: {
          not: "disabled",
        },
      },
      include: {
        businesses: {
          where: {
            status: "active",
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!city) {
      return reply.code(404).send({
        status: "error",
        error: "City not found",
      });
    }

    return reply.send({
      status: "ok",
      item: mapPublicCity(city),
    });
  });

  app.get("/api/v2/public/businesses", async (request, reply) => {
    const parsed = parsePayload(publicListBusinessesQuerySchema, request.query);

    if (!parsed.success) {
      return reply.code(parsed.response.statusCode).send(parsed.response.body);
    }

    const businesses = await prisma.business.findMany({
      where: {
        status: "active",
        city: {
          active: true,
          status: {
            not: "disabled",
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: parsed.data.limit,
      include: {
        city: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
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
      },
    });

    return reply.send({
      status: "ok",
      items: businesses.map(mapPublicBusiness),
    });
  });

  app.get("/api/v2/public/cities/:citySlug/businesses", async (request, reply) => {
    const paramsParsed = parsePayload(publicCityParamsSchema, request.params);
    const queryParsed = parsePayload(publicListBusinessesQuerySchema, request.query);

    if (!paramsParsed.success) {
      return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
    }

    if (!queryParsed.success) {
      return reply.code(queryParsed.response.statusCode).send(queryParsed.response.body);
    }

    const city = await prisma.city.findFirst({
      where: {
        slug: paramsParsed.data.citySlug,
        active: true,
        status: {
          not: "disabled",
        },
      },
      select: {
        id: true,
      },
    });

    if (!city) {
      return reply.code(404).send({
        status: "error",
        error: "City not found",
      });
    }

    const businesses = await prisma.business.findMany({
      where: {
        cityId: city.id,
        status: "active",
      },
      orderBy: [{ createdAt: "desc" }],
      take: queryParsed.data.limit,
      include: {
        city: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
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
      },
    });

    return reply.send({
      status: "ok",
      items: businesses.map(mapPublicBusiness),
    });
  });

  app.get("/api/v2/public/cities/:citySlug/businesses/:businessSlug", async (request, reply) => {
    const parsed = parsePayload(publicBusinessParamsSchema, request.params);

    if (!parsed.success) {
      return reply.code(parsed.response.statusCode).send(parsed.response.body);
    }

    const business = await prisma.business.findFirst({
      where: {
        slug: parsed.data.businessSlug,
        status: "active",
        city: {
          slug: parsed.data.citySlug,
          active: true,
          status: {
            not: "disabled",
          },
        },
      },
      include: {
        city: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
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
      },
    });

    if (!business) {
      return reply.code(404).send({
        status: "error",
        error: "Business not found",
      });
    }

    return reply.send({
      status: "ok",
      item: mapPublicBusiness(business),
    });
  });
}
