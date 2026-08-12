import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../src/app.js";
import { createAuthToken, hashPassword, verifyPassword } from "../../src/auth.js";
import { prisma } from "../../src/database.js";

const databaseUrl = process.env.DATABASE_URL_TEST;
if (!databaseUrl || !/test/i.test(databaseUrl))
  throw new Error("DATABASE_URL_TEST is required for integration tests.");

const app = buildApp();
let cityId = "";
let businessId = "";
let token = "";
let otherToken = "";

async function createCityAdmin() {
  const admin = await prisma.user.create({
    data: { email: "admin@example.test", status: "active" },
  });
  const grant = await prisma.accessGrant.create({
    data: { userId: admin.id, role: "city_admin", scopeType: "city", cityId },
  });
  return createAuthToken(admin.id, admin.authVersion, grant.id);
}

async function request(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  body?: unknown,
  auth = token,
  remoteAddress?: string,
) {
  return app.inject({
    method,
    url,
    payload: body,
    headers: auth ? { authorization: `Bearer ${auth}` } : {},
    remoteAddress,
  });
}

beforeAll(async () => app.ready());
afterAll(async () => app.close());
beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    "TRUNCATE TABLE pickup_order_items, pickup_orders, business_ordering_settings, business_inquiries, business_opening_intervals, business_opening_days, business_services, business_category_assignments, city_categories, access_grants, businesses, business_templates, cities, users CASCADE",
  );
  const template = await prisma.businessTemplate.create({
    data: { code: "test-local", name: "Test", category: "service", primaryModule: "catalog" },
  });
  const city = await prisma.city.create({
    data: { name: "Test City", slug: "test-city", status: "active" },
  });
  cityId = city.id;
  const business = await prisma.business.create({
    data: {
      cityId,
      templateId: template.id,
      name: "Test Business",
      slug: "test-business",
      publicSubtitle: "Descrizione test",
      publicEmail: "business@example.test",
    },
  });
  businessId = business.id;
  const user = await prisma.user.create({
    data: { email: "owner@example.test", status: "active" },
  });
  const grant = await prisma.accessGrant.create({
    data: { userId: user.id, role: "local_admin", scopeType: "business", cityId, businessId },
  });
  token = createAuthToken(user.id, user.authVersion, grant.id);
  const otherBusiness = await prisma.business.create({
    data: { cityId, templateId: template.id, name: "Other", slug: "other-business" },
  });
  const other = await prisma.user.create({
    data: { email: "other@example.test", status: "active" },
  });
  const otherGrant = await prisma.accessGrant.create({
    data: {
      userId: other.id,
      role: "local_admin",
      scopeType: "business",
      cityId,
      businessId: otherBusiness.id,
    },
  });
  otherToken = createAuthToken(other.id, other.authVersion, otherGrant.id);
});

describe("platform core integration", () => {
  it("creates category trees and preserves city scope", async () => {
    const unauthorized = await request(
      "POST",
      "/api/v2/platform-core/cities/test-city/categories",
      { name: "Food" },
      "",
    );
    expect(unauthorized.statusCode).toBe(401);
    const response = await request("POST", "/api/v2/platform-core/cities/test-city/categories", {
      name: "Food",
    });
    expect(response.statusCode).toBe(403);
    const adminToken = await createCityAdmin();
    const parent = await request(
      "POST",
      "/api/v2/platform-core/cities/test-city/categories",
      { name: "Food" },
      adminToken,
    );
    expect(parent.statusCode).toBe(201);
    const child = await request(
      "POST",
      "/api/v2/platform-core/cities/test-city/categories",
      { name: "Pizza", parentId: parent.json().item.id },
      adminToken,
    );
    expect(child.statusCode).toBe(201);
    const cityUpdate = await request(
      "PATCH",
      "/api/v2/platform-core/cities/test-city",
      { name: "Test City Updated" },
      adminToken,
    );
    expect(cityUpdate.statusCode).toBe(200);
    expect(cityUpdate.json().item.activeCategoryCount).toBe(2);
    const tree = await request(
      "GET",
      "/api/v2/platform-core/cities/test-city/categories",
      undefined,
      adminToken,
    );
    expect(tree.json().tree[0].children).toHaveLength(1);
    const blocked = await request(
      "DELETE",
      `/api/v2/platform-core/cities/test-city/categories/${parent.json().item.id}`,
      undefined,
      adminToken,
    );
    expect(blocked.statusCode).toBe(409);

    const otherCity = await prisma.city.create({
      data: { name: "Other city", slug: "other-city", status: "active" },
    });
    const otherCategory = await prisma.cityCategory.create({
      data: { cityId: otherCity.id, name: "Foreign", slug: "foreign" },
    });
    const foreignParent = await request(
      "POST",
      "/api/v2/platform-core/cities/test-city/categories",
      { name: "Invalid parent", parentId: otherCategory.id },
      adminToken,
    );
    expect(foreignParent.statusCode).toBe(400);
    const removable = await request(
      "POST",
      "/api/v2/platform-core/cities/test-city/categories",
      { name: "Removable" },
      adminToken,
    );
    const removed = await request(
      "DELETE",
      `/api/v2/platform-core/cities/test-city/categories/${removable.json().item.id}`,
      undefined,
      adminToken,
    );
    expect(removed.statusCode).toBe(204);
  });

  it("updates only the scoped business and enforces publish slug rules", async () => {
    const detail = await request(
      "GET",
      "/api/v2/platform-core/cities/test-city/businesses/test-business",
    );
    expect(detail.statusCode).toBe(200);
    expect(detail.json().item.id).toBe(businessId);
    expect(
      (
        await request(
          "GET",
          "/api/v2/platform-core/cities/test-city/businesses/test-business",
          undefined,
          otherToken,
        )
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await request(
          "GET",
          "/api/v2/platform-core/cities/test-city/businesses/test-business",
          undefined,
          "",
        )
      ).statusCode,
    ).toBe(401);

    const updated = await request(
      "PATCH",
      "/api/v2/platform-core/cities/test-city/businesses/test-business",
      {
        locality: "Cagliari",
        province: "CA",
        publicEmail: "privacy@example.test",
        privacyContactEmail: "privacy@example.test",
        socialLinks: { instagram: "https://instagram.com/test" },
      },
    );
    expect(updated.statusCode).toBe(200);
    expect((await prisma.business.findUniqueOrThrow({ where: { id: businessId } })).locality).toBe(
      "Cagliari",
    );
    const denied = await request(
      "PATCH",
      "/api/v2/platform-core/cities/test-city/businesses/test-business",
      { locality: "Blocked" },
      otherToken,
    );
    expect(denied.statusCode).toBe(403);
    const category = await prisma.cityCategory.create({
      data: { cityId, name: "Ready", slug: "ready" },
    });
    await prisma.businessCategoryAssignment.create({
      data: { businessId, categoryId: category.id },
    });
    expect(
      (
        await request(
          "POST",
          "/api/v2/platform-core/cities/test-city/businesses/test-business/publish",
        )
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await request("PATCH", "/api/v2/platform-core/cities/test-city/businesses/test-business", {
          slug: "blocked-slug",
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await request(
          "POST",
          "/api/v2/platform-core/cities/test-city/businesses/test-business/unpublish",
        )
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await request("PATCH", "/api/v2/platform-core/cities/test-city/businesses/test-business", {
          slug: "renamed-business",
        })
      ).statusCode,
    ).toBe(200);
  });

  it("replaces categories atomically and validates opening hours", async () => {
    const category = await prisma.cityCategory.create({
      data: { cityId, name: "Services", slug: "services" },
    });
    const replace = await request(
      "PUT",
      "/api/v2/platform-core/cities/test-city/businesses/test-business/categories",
      { categoryIds: [category.id], primaryCategoryId: category.id },
    );
    expect(replace.statusCode).toBe(200);
    const inactiveCategory = await prisma.cityCategory.create({
      data: { cityId, name: "Inactive", slug: "inactive", active: false },
    });
    const otherCity = await prisma.city.create({
      data: { name: "Category scope city", slug: "category-scope-city", status: "active" },
    });
    const foreignCategory = await prisma.cityCategory.create({
      data: { cityId: otherCity.id, name: "Foreign", slug: "foreign" },
    });
    const categoriesResponse = await request(
      "GET",
      "/api/v2/platform-core/cities/test-city/businesses/test-business/categories",
    );
    expect(categoriesResponse.statusCode).toBe(200);
    expect(categoriesResponse.json().items[0].id).toBe(category.id);
    expect(
      categoriesResponse.json().availableCategories.map((item: { id: string }) => item.id),
    ).toEqual(expect.arrayContaining([category.id, inactiveCategory.id]));
    expect(
      categoriesResponse.json().availableCategories.map((item: { id: string }) => item.id),
    ).not.toContain(foreignCategory.id);
    const failed = await request(
      "PUT",
      "/api/v2/platform-core/cities/test-city/businesses/test-business/categories",
      { categoryIds: ["missing"] },
    );
    expect(failed.statusCode).toBe(400);
    expect(await prisma.businessCategoryAssignment.count({ where: { businessId } })).toBe(1);
    const days = Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      isClosed: weekday === 6,
      intervals: weekday === 6 ? [] : [{ opensAt: "09:00", closesAt: "12:00" }],
    }));
    const hours = await request(
      "PUT",
      "/api/v2/platform-core/cities/test-city/businesses/test-business/opening-hours",
      { days },
    );
    expect(hours.statusCode).toBe(200);
    const overlap = await request(
      "PUT",
      "/api/v2/platform-core/cities/test-city/businesses/test-business/opening-hours",
      {
        days: [
          {
            ...days[0],
            intervals: [
              { opensAt: "09:00", closesAt: "12:00" },
              { opensAt: "11:00", closesAt: "13:00" },
            ],
          },
          ...days.slice(1),
        ],
      },
    );
    expect(overlap.statusCode).toBe(400);
    expect(await prisma.businessOpeningDay.count({ where: { businessId } })).toBe(7);
    const assignedDelete = await request(
      "DELETE",
      `/api/v2/platform-core/cities/test-city/categories/${category.id}`,
      undefined,
      await createCityAdmin(),
    );
    expect(assignedDelete.statusCode).toBe(409);
  });

  it("lets the scoped owner select business modules while keeping the template primary module", async () => {
    const updated = await request(
      "PUT",
      "/api/v2/platform-core/cities/test-city/businesses/test-business/modules",
      { moduleCodes: ["content", "forms_inbox"] },
    );
    expect(updated.statusCode).toBe(200);
    expect(updated.json().items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ moduleCode: "catalog", active: true }),
        expect.objectContaining({ moduleCode: "content", active: true }),
        expect.objectContaining({ moduleCode: "forms_inbox", active: true }),
      ]),
    );

    const replaced = await request(
      "PUT",
      "/api/v2/platform-core/cities/test-city/businesses/test-business/modules",
      { moduleCodes: ["events"] },
    );
    expect(replaced.statusCode).toBe(200);
    expect(
      await prisma.businessModule.findMany({
        where: { businessId },
        select: { moduleCode: true, active: true },
      }),
    ).toEqual(
      expect.arrayContaining([
        { moduleCode: "catalog", active: true },
        { moduleCode: "content", active: false },
        { moduleCode: "events", active: true },
        { moduleCode: "forms_inbox", active: false },
      ]),
    );

    const denied = await request(
      "PUT",
      "/api/v2/platform-core/cities/test-city/businesses/test-business/modules",
      { moduleCodes: ["booking"] },
      otherToken,
    );
    expect(denied.statusCode).toBe(404);
  });

  it("publishes a ready business, exposes services, and isolates inquiries", async () => {
    const category = await prisma.cityCategory.create({
      data: { cityId, name: "Services", slug: "services" },
    });
    await prisma.businessCategoryAssignment.create({
      data: { businessId, categoryId: category.id, primary: true },
    });
    const service = await request(
      "POST",
      "/api/v2/platform-core/cities/test-city/businesses/test-business/services",
      {
        name: "Consultation",
        shortDescription: "Initial assessment",
        description: "Detailed service description",
        status: "published",
      },
    );
    expect(service.statusCode).toBe(201);
    const publish = await request(
      "POST",
      "/api/v2/platform-core/cities/test-city/businesses/test-business/publish",
    );
    expect(publish.statusCode).toBe(200);
    const publicCities = await request(
      "GET",
      "/api/v2/public/cities?page=1&limit=1",
      undefined,
      "",
    );
    expect(publicCities.statusCode).toBe(200);
    expect(publicCities.json()).toEqual(expect.objectContaining({ page: 1, limit: 1, total: 1 }));
    const publicBusinesses = await request(
      "GET",
      "/api/v2/public/cities/test-city/businesses?page=1&limit=1",
      undefined,
      "",
    );
    expect(publicBusinesses.statusCode).toBe(200);
    expect(publicBusinesses.json()).toEqual(
      expect.objectContaining({ page: 1, limit: 1, total: 1 }),
    );
    expect(publicBusinesses.json().items[0]).toEqual(
      expect.objectContaining({
        serviceNames: ["Consultation"],
        serviceSearchTerms: ["Consultation", "Initial assessment", "Detailed service description"],
      }),
    );
    const publicServices = await request(
      "GET",
      "/api/v2/public/cities/test-city/businesses/test-business/services",
      undefined,
      "",
    );
    expect(publicServices.statusCode).toBe(200);
    const inquiry = await request(
      "POST",
      "/api/v2/public/cities/test-city/businesses/test-business/inquiries",
      {
        name: "Visitor",
        email: "visitor@example.test",
        message: "Vorrei ricevere maggiori informazioni.",
        privacyAccepted: true,
      },
      "",
    );
    expect(inquiry.statusCode).toBe(201);
    const inbox = await request(
      "GET",
      "/api/v2/platform-core/cities/test-city/businesses/test-business/inquiries",
    );
    expect(inbox.json().total).toBe(1);
    const denied = await request(
      "GET",
      "/api/v2/platform-core/cities/test-city/businesses/test-business/inquiries",
      undefined,
      otherToken,
    );
    expect(denied.statusCode).toBe(404);
  });

  it("manages services and inquiry state transitions without cross-business access", async () => {
    const service = await request(
      "POST",
      "/api/v2/platform-core/cities/test-city/businesses/test-business/services",
      { name: "First service", priceCents: 850, sortOrder: 2 },
    );
    const serviceId = service.json().item.id;
    expect(service.statusCode).toBe(201);
    expect(
      (
        await request(
          "PATCH",
          `/api/v2/platform-core/cities/test-city/businesses/test-business/services/${serviceId}`,
          { name: "Updated service", priceCents: 900, sortOrder: 1 },
        )
      ).statusCode,
    ).toBe(200);
    expect(
      (await prisma.businessService.findUniqueOrThrow({ where: { id: serviceId } })).priceCents,
    ).toBe(900);
    expect(
      (
        await request(
          "DELETE",
          `/api/v2/platform-core/cities/test-city/businesses/other-business/services/${serviceId}`,
          undefined,
          otherToken,
        )
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await request(
          "DELETE",
          `/api/v2/platform-core/cities/test-city/businesses/test-business/services/${serviceId}`,
        )
      ).statusCode,
    ).toBe(204);
    const inquiry = await prisma.businessInquiry.create({
      data: {
        businessId,
        name: "Visitor",
        email: "visitor@example.test",
        message: "A sufficiently detailed integration test inquiry.",
        privacyAccepted: true,
      },
    });
    const read = await request(
      "PATCH",
      `/api/v2/platform-core/cities/test-city/businesses/test-business/inquiries/${inquiry.id}`,
      { status: "read", internalNote: "handled" },
    );
    expect(read.statusCode).toBe(200);
    expect(read.json().item.readAt).not.toBeNull();
    expect(
      (
        await request(
          "PATCH",
          `/api/v2/platform-core/cities/test-city/businesses/test-business/inquiries/${inquiry.id}`,
          { status: "closed" },
        )
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await request(
          "PATCH",
          `/api/v2/platform-core/cities/test-city/businesses/test-business/inquiries/${inquiry.id}`,
          { status: "read" },
        )
      ).statusCode,
    ).toBe(409);
  });

  it("rejects invalid public inquiries and applies the per-IP rate limit", async () => {
    const invalidPrivacy = await request(
      "POST",
      "/api/v2/public/cities/test-city/businesses/test-business/inquiries",
      {
        name: "Visitor",
        email: "visitor@example.test",
        message: "A valid looking inquiry body.",
        privacyAccepted: false,
      },
      "",
    );
    expect(invalidPrivacy.statusCode).toBe(400);
    const invalidHtml = await request(
      "POST",
      "/api/v2/public/cities/test-city/businesses/test-business/inquiries",
      {
        name: "<b>Visitor</b>",
        email: "visitor@example.test",
        message: "A valid looking inquiry body.",
        privacyAccepted: true,
      },
      "",
    );
    expect(invalidHtml.statusCode).toBe(400);
    const category = await prisma.cityCategory.create({
      data: { cityId, name: "Published", slug: "published" },
    });
    await prisma.businessCategoryAssignment.create({
      data: { businessId, categoryId: category.id },
    });
    expect(
      (
        await request(
          "POST",
          "/api/v2/platform-core/cities/test-city/businesses/test-business/publish",
        )
      ).statusCode,
    ).toBe(200);
    const body = {
      name: "Rate visitor",
      email: "rate@example.test",
      message: "A sufficiently detailed public inquiry for the rate limit.",
      privacyAccepted: true,
    };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(
        (
          await request(
            "POST",
            "/api/v2/public/cities/test-city/businesses/test-business/inquiries",
            body,
            "",
            "203.0.113.8",
          )
        ).statusCode,
      ).toBe(201);
    }
    expect(
      (
        await request(
          "POST",
          "/api/v2/public/cities/test-city/businesses/test-business/inquiries",
          body,
          "",
          "203.0.113.8",
        )
      ).statusCode,
    ).toBe(429);
    expect(
      (
        await request(
          "POST",
          "/api/v2/public/cities/test-city/businesses/test-business/inquiries",
          body,
          "",
          "203.0.113.9",
        )
      ).statusCode,
    ).toBe(201);
  });

  it("accepts a priced pickup order only in an available slot and exposes it to the operator", async () => {
    const category = await prisma.cityCategory.create({
      data: { cityId, name: "Food", slug: "food" },
    });
    await prisma.businessCategoryAssignment.create({
      data: { businessId, categoryId: category.id, primary: true },
    });
    const service = await request(
      "POST",
      "/api/v2/platform-core/cities/test-city/businesses/test-business/services",
      { name: "Pizza test", priceCents: 750, pickupEnabled: true, status: "published" },
    );
    const days = Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      isClosed: false,
      intervals: [{ opensAt: "08:00", closesAt: "23:00" }],
    }));
    expect(
      (
        await request(
          "PUT",
          "/api/v2/platform-core/cities/test-city/businesses/test-business/opening-hours",
          { days },
        )
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await request(
          "PUT",
          "/api/v2/platform-core/cities/test-city/businesses/test-business/pickup-ordering",
          { enabled: true, pickupLeadMinutes: 0, slotMinutes: 15, slotCapacity: 2 },
        )
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await request(
          "POST",
          "/api/v2/platform-core/cities/test-city/businesses/test-business/publish",
        )
      ).statusCode,
    ).toBe(200);

    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const pickupDate = tomorrow.toISOString().slice(0, 10);
    const menu = await request(
      "GET",
      "/api/v2/public/cities/test-city/businesses/test-business/orders/menu",
      undefined,
      "",
    );
    expect(menu.statusCode).toBe(200);
    expect(menu.json().items[0].priceCents).toBe(750);
    await prisma.businessService.create({
      data: {
        businessId,
        name: "Not available for pickup",
        slug: "not-for-pickup",
        priceCents: 500,
        pickupEnabled: false,
        status: "published",
      },
    });
    const refreshedMenu = await request(
      "GET",
      "/api/v2/public/cities/test-city/businesses/test-business/orders/menu",
      undefined,
      "",
    );
    expect(refreshedMenu.json().items.map((item: { name: string }) => item.name)).toEqual([
      "Pizza test",
    ]);
    const availability = await request(
      "GET",
      `/api/v2/public/cities/test-city/businesses/test-business/orders/availability?date=${pickupDate}`,
      undefined,
      "",
    );
    expect(availability.statusCode).toBe(200);
    const slot = availability.json().items.find((item: { available: boolean }) => item.available);
    expect(slot).toBeDefined();
    const order = await request(
      "POST",
      "/api/v2/public/cities/test-city/businesses/test-business/orders",
      {
        name: "Pickup visitor",
        email: "pickup@example.test",
        pickupDate,
        pickupTime: slot.time,
        privacyAccepted: true,
        items: [{ serviceId: service.json().item.id, quantity: 2 }],
      },
      "",
      "203.0.113.42",
    );
    expect(order.statusCode).toBe(201);
    expect(order.json().item.totalCents).toBe(1500);
    expect(order.json().item.reference).toMatch(/^CC-/);

    expect(
      (
        await request(
          "POST",
          "/api/v2/public/cities/test-city/businesses/test-business/orders",
          {
            name: "Second pickup visitor",
            email: "pickup-second@example.test",
            pickupDate,
            pickupTime: slot.time,
            privacyAccepted: true,
            items: [{ serviceId: service.json().item.id, quantity: 1 }],
          },
          "",
          "203.0.113.42",
        )
      ).statusCode,
    ).toBe(201);
    expect(
      (
        await request(
          "POST",
          "/api/v2/public/cities/test-city/businesses/test-business/orders",
          {
            name: "Third pickup visitor",
            email: "pickup-third@example.test",
            pickupDate,
            pickupTime: slot.time,
            privacyAccepted: true,
            items: [{ serviceId: service.json().item.id, quantity: 1 }],
          },
          "",
          "203.0.113.42",
        )
      ).statusCode,
    ).toBe(409);

    const inbox = await request(
      "GET",
      "/api/v2/platform-core/cities/test-city/businesses/test-business/pickup-orders",
    );
    expect(inbox.statusCode).toBe(200);
    expect(inbox.json().total).toBe(2);
    expect(
      (
        await request(
          "PATCH",
          `/api/v2/platform-core/cities/test-city/businesses/test-business/pickup-orders/${inbox.json().items[0].id}`,
          { status: "accepted" },
        )
      ).statusCode,
    ).toBe(200);
  });

  it("removes public visibility when a published city becomes inactive", async () => {
    const category = await prisma.cityCategory.create({
      data: { cityId, name: "Visibility", slug: "visibility" },
    });
    await prisma.businessCategoryAssignment.create({
      data: { businessId, categoryId: category.id },
    });
    await request(
      "POST",
      "/api/v2/platform-core/cities/test-city/businesses/test-business/publish",
    );
    expect(
      (
        await request(
          "GET",
          "/api/v2/public/cities/test-city/businesses/test-business",
          undefined,
          "",
        )
      ).statusCode,
    ).toBe(200);
    await prisma.city.update({ where: { id: cityId }, data: { active: false } });
    expect(
      (
        await request(
          "GET",
          "/api/v2/public/cities/test-city/businesses/test-business",
          undefined,
          "",
        )
      ).statusCode,
    ).toBe(404);
  });

  it("exposes only active same-city category assignments for public businesses", async () => {
    const restaurant = await prisma.cityCategory.create({
      data: { cityId, name: "Ristorante", slug: "ristorante" },
    });
    const pizza = await prisma.cityCategory.create({
      data: { cityId, name: "Pizza", slug: "pizza" },
    });
    const inactive = await prisma.cityCategory.create({
      data: { cityId, name: "Nascosta", slug: "nascosta", active: false },
    });
    const otherCity = await prisma.city.create({
      data: { name: "Foreign City", slug: "foreign-city", status: "active" },
    });
    const foreign = await prisma.cityCategory.create({
      data: { cityId: otherCity.id, name: "Fuori città", slug: "fuori-citta" },
    });
    await prisma.businessCategoryAssignment.createMany({
      data: [
        { businessId, categoryId: restaurant.id, sortOrder: 1 },
        { businessId, categoryId: pizza.id, sortOrder: 0 },
        { businessId, categoryId: inactive.id, sortOrder: -1 },
        { businessId, categoryId: foreign.id, sortOrder: -2 },
      ],
    });
    await prisma.business.update({
      where: { id: businessId },
      data: { status: "active", publishedAt: new Date() },
    });

    const expectedCategories = [
      { id: pizza.id, name: "Pizza", slug: "pizza" },
      { id: restaurant.id, name: "Ristorante", slug: "ristorante" },
    ];
    const globalResponse = await request("GET", "/api/v2/public/businesses", undefined, "");
    const cityResponse = await request(
      "GET",
      "/api/v2/public/cities/test-city/businesses",
      undefined,
      "",
    );
    const detailResponse = await request(
      "GET",
      "/api/v2/public/cities/test-city/businesses/test-business",
      undefined,
      "",
    );

    expect(globalResponse.statusCode).toBe(200);
    expect(cityResponse.statusCode).toBe(200);
    expect(detailResponse.statusCode).toBe(200);
    expect(
      globalResponse.json().items.find((item: { id: string }) => item.id === businessId).categories,
    ).toEqual(expectedCategories);
    expect(cityResponse.json().items[0].categories).toEqual(expectedCategories);
    expect(detailResponse.json().item.categories).toEqual(expectedCategories);
    expect(
      globalResponse.json().items.some((item: { slug: string }) => item.slug === "other-business"),
    ).toBe(false);
    expect(
      (
        await request(
          "GET",
          "/api/v2/public/cities/test-city/businesses/other-business",
          undefined,
          "",
        )
      ).statusCode,
    ).toBe(404);
  });

  it("updates a city category independently", async () => {
    const adminToken = await createCityAdmin();
    const created = await request(
      "POST",
      "/api/v2/platform-core/cities/test-city/categories",
      { name: "Original", sortOrder: 3 },
      adminToken,
    );
    const updated = await request(
      "PATCH",
      `/api/v2/platform-core/cities/test-city/categories/${created.json().item.id}`,
      { name: "Updated", sortOrder: 1 },
      adminToken,
    );
    expect(updated.statusCode).toBe(200);
    expect(updated.json().item.name).toBe("Updated");
    expect(
      (await prisma.cityCategory.findUniqueOrThrow({ where: { id: created.json().item.id } }))
        .sortOrder,
    ).toBe(1);
  });

  it("keeps category order deterministic in the city tree", async () => {
    const adminToken = await createCityAdmin();
    await prisma.cityCategory.createMany({
      data: [
        { cityId, name: "Later", slug: "later", sortOrder: 2 },
        { cityId, name: "First", slug: "first", sortOrder: 1 },
      ],
    });
    const response = await request(
      "GET",
      "/api/v2/platform-core/cities/test-city/categories",
      undefined,
      adminToken,
    );
    expect(response.statusCode).toBe(200);
    expect(response.json().tree.map((item: { name: string }) => item.name)).toEqual([
      "First",
      "Later",
    ]);
  });

  it("keeps business category assignments when a foreign city category is supplied", async () => {
    const assigned = await prisma.cityCategory.create({
      data: { cityId, name: "Assigned", slug: "assigned" },
    });
    await prisma.businessCategoryAssignment.create({
      data: { businessId, categoryId: assigned.id },
    });
    const otherCity = await prisma.city.create({
      data: { name: "Foreign City", slug: "foreign-city", status: "active" },
    });
    const foreign = await prisma.cityCategory.create({
      data: { cityId: otherCity.id, name: "Foreign", slug: "foreign" },
    });
    const response = await request(
      "PUT",
      "/api/v2/platform-core/cities/test-city/businesses/test-business/categories",
      { categoryIds: [foreign.id] },
    );
    expect(response.statusCode).toBe(400);
    expect(
      await prisma.businessCategoryAssignment.findMany({ where: { businessId } }),
    ).toHaveLength(1);
  });

  it("returns 404 when deleting an unknown service", async () => {
    const response = await request(
      "DELETE",
      "/api/v2/platform-core/cities/test-city/businesses/test-business/services/missing-service",
    );
    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe("Service not found");
  });

  it("does not expose services for a draft business", async () => {
    await prisma.businessService.create({
      data: { businessId, name: "Hidden", slug: "hidden", status: "published" },
    });
    const response = await request(
      "GET",
      "/api/v2/public/cities/test-city/businesses/test-business/services",
      undefined,
      "",
    );
    expect(response.statusCode).toBe(404);
  });

  it("rejects a duplicate business slug in the same city", async () => {
    const response = await request(
      "PATCH",
      "/api/v2/platform-core/cities/test-city/businesses/test-business",
      { slug: "other-business" },
    );
    expect(response.statusCode).toBe(409);
    expect(response.json().error).toBe(
      "A business with the same slug already exists in this city.",
    );
    expect((await prisma.business.findUniqueOrThrow({ where: { id: businessId } })).slug).toBe(
      "test-business",
    );
  });

  it("protects administrative business fields and revokes a replaced owner", async () => {
    expect(
      (
        await request("PATCH", "/api/v2/platform-core/cities/test-city/businesses/test-business", {
          status: "active",
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await request("PATCH", "/api/v2/platform-core/cities/test-city/businesses/test-business", {
          plan: "enterprise",
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await request("PATCH", "/api/v2/platform-core/cities/test-city/businesses/test-business", {
          ownerEmail: "delegated@example.test",
        })
      ).statusCode,
    ).toBe(403);

    const ownerGrant = await prisma.accessGrant.findFirstOrThrow({
      where: { businessId, role: "local_admin" },
    });
    await prisma.business.update({
      where: { id: businessId },
      data: { ownerUserId: ownerGrant.userId },
    });
    const ordinaryProfileUpdate = await request(
      "PATCH",
      "/api/v2/platform-core/cities/test-city/businesses/test-business",
      { name: "Test Business updated" },
    );
    expect(ordinaryProfileUpdate.statusCode).toBe(200);
    expect(
      (await prisma.accessGrant.findUniqueOrThrow({ where: { id: ownerGrant.id } })).active,
    ).toBe(true);
    const cityAdminToken = await createCityAdmin();
    expect(
      (
        await request(
          "POST",
          "/api/v2/platform-core/businesses",
          {
            citySlug: "test-city",
            templateCode: "local_business",
            name: "Unauthorized enterprise",
            plan: "enterprise",
          },
          cityAdminToken,
        )
      ).statusCode,
    ).toBe(403);
    const removed = await request(
      "PATCH",
      "/api/v2/platform-core/cities/test-city/businesses/test-business",
      { ownerEmail: null },
      cityAdminToken,
    );
    expect(removed.statusCode).toBe(200);
    expect(
      (await prisma.accessGrant.findUniqueOrThrow({ where: { id: ownerGrant.id } })).active,
    ).toBe(false);
  });

  it("creates a usable owner account and persists the accepted business profile", async () => {
    const cityAdminToken = await createCityAdmin();
    const invalidTimezone = await request(
      "POST",
      "/api/v2/platform-core/businesses",
      {
        citySlug: "test-city",
        templateCode: "local_business",
        name: "Invalid timezone business",
        timezone: "Not/A-Timezone",
      },
      cityAdminToken,
    );
    expect(invalidTimezone.statusCode).toBe(400);

    const response = await request(
      "POST",
      "/api/v2/platform-core/businesses",
      {
        citySlug: "test-city",
        templateCode: "local_business",
        name: "Created business",
        ownerEmail: "created-owner@example.test",
        ownerPassword: "OwnerPassword!2026",
        locality: "Cagli",
        province: "PU",
        lat: 43.547,
        lng: 12.648,
        currency: "EUR",
        locale: "it-IT",
        privacyContactEmail: "privacy@example.test",
        socialLinks: { instagram: "https://instagram.com/created-business" },
      },
      cityAdminToken,
    );
    expect(response.statusCode).toBe(201);
    const created = await prisma.business.findUniqueOrThrow({
      where: { id: response.json().item.id },
      include: { ownerUser: true },
    });
    expect(created).toEqual(
      expect.objectContaining({ locality: "Cagli", province: "PU", lat: 43.547, lng: 12.648 }),
    );
    expect(created.ownerUser?.status).toBe("active");
    expect(verifyPassword("OwnerPassword!2026", created.ownerUser?.passwordHash)).toBe(true);

    const existingPasswordHash = hashPassword("ExistingOwner!2026");
    const invitedOwner = await prisma.user.create({
      data: {
        email: "invited-with-password@example.test",
        status: "invited",
        passwordHash: existingPasswordHash,
      },
    });
    const assignedExistingOwner = await request(
      "POST",
      "/api/v2/platform-core/businesses",
      {
        citySlug: "test-city",
        templateCode: "local_business",
        name: "Existing owner business",
        ownerEmail: invitedOwner.email,
      },
      cityAdminToken,
    );
    expect(assignedExistingOwner.statusCode).toBe(201);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: invitedOwner.id } })).toEqual(
      expect.objectContaining({ status: "active", passwordHash: existingPasswordHash }),
    );

    const disabledOwner = await prisma.user.create({
      data: { email: "disabled-owner@example.test", status: "disabled" },
    });
    const rejectedDisabledOwner = await request(
      "POST",
      "/api/v2/platform-core/businesses",
      {
        citySlug: "test-city",
        templateCode: "local_business",
        name: "Disabled owner business",
        ownerEmail: disabledOwner.email,
      },
      cityAdminToken,
    );
    expect(rejectedDisabledOwner.statusCode).toBe(409);
  });

  it("rotates a scoped temporary password and invalidates previous sessions", async () => {
    const ownerGrant = await prisma.accessGrant.findFirstOrThrow({
      where: { businessId, role: "local_admin" },
      include: { user: true },
    });
    const previousAuthVersion = ownerGrant.user.authVersion;
    const cityAdminToken = await createCityAdmin();
    const rotated = await request(
      "PATCH",
      `/api/v2/platform-core/access-grants/${ownerGrant.id}`,
      { temporaryPassword: "Temporary!2026" },
      cityAdminToken,
    );
    expect(rotated.statusCode).toBe(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: ownerGrant.userId } });
    expect(user.status).toBe("active");
    expect(user.authVersion).toBe(previousAuthVersion + 1);
    expect(verifyPassword("Temporary!2026", user.passwordHash)).toBe(true);
    expect(
      (await request("GET", "/api/v2/platform-core/cities/test-city/businesses/test-business"))
        .statusCode,
    ).toBe(401);
  });

  it("rejects orphaned scoped grants and keeps customer inboxes from staff", async () => {
    const ownerGrant = await prisma.accessGrant.findFirstOrThrow({
      where: { businessId, role: "local_admin" },
    });
    await prisma.accessGrant.update({ where: { id: ownerGrant.id }, data: { businessId: null } });
    expect(
      (
        await request(
          "GET",
          "/api/v2/platform-core/businesses",
          undefined,
          createAuthToken(ownerGrant.userId, 1, ownerGrant.id),
        )
      ).statusCode,
    ).toBe(401);

    const staff = await prisma.user.create({
      data: { email: "staff@example.test", status: "active" },
    });
    const staffGrant = await prisma.accessGrant.create({
      data: { userId: staff.id, role: "staff", scopeType: "business", cityId, businessId },
    });
    const staffToken = createAuthToken(staff.id, staff.authVersion, staffGrant.id);
    expect(
      (
        await request(
          "GET",
          "/api/v2/platform-core/cities/test-city/businesses/test-business/inquiries",
          undefined,
          staffToken,
        )
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await request(
          "GET",
          "/api/v2/platform-core/cities/test-city/businesses/test-business/pickup-orders",
          undefined,
          staffToken,
        )
      ).statusCode,
    ).toBe(403);
  });

  it("preserves readiness invariants for published businesses and categories", async () => {
    const category = await prisma.cityCategory.create({
      data: { cityId, name: "Only active category", slug: "only-active" },
    });
    await prisma.businessCategoryAssignment.create({
      data: { businessId, categoryId: category.id },
    });
    expect(
      (
        await request(
          "POST",
          "/api/v2/platform-core/cities/test-city/businesses/test-business/publish",
        )
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await request("PATCH", "/api/v2/platform-core/cities/test-city/businesses/test-business", {
          publicSubtitle: null,
          publicDescription: null,
        })
      ).statusCode,
    ).toBe(409);
    const cityAdminToken = await createCityAdmin();
    expect(
      (
        await request(
          "PATCH",
          `/api/v2/platform-core/cities/test-city/categories/${category.id}`,
          { active: false },
          cityAdminToken,
        )
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await request(
          "DELETE",
          `/api/v2/platform-core/cities/test-city/businesses/test-business/categories/${category.id}`,
        )
      ).statusCode,
    ).toBe(409);
  });

  it("initializes the first global admin once and returns a usable session", async () => {
    const initialStatus = await request(
      "GET",
      "/api/v2/auth/bootstrap-status",
      undefined,
      "",
      "203.0.113.20",
    );
    expect(initialStatus.statusCode).toBe(200);
    expect(initialStatus.json()).toEqual(
      expect.objectContaining({ required: true, available: true, secretRequired: false }),
    );

    const initialized = await request(
      "POST",
      "/api/v2/auth/bootstrap-admin",
      {
        email: "global-admin@example.test",
        password: "Bootstrap!2026",
        name: "Global Admin",
      },
      "",
      "203.0.113.20",
    );
    expect(initialized.statusCode).toBe(201);
    expect(
      (await request("GET", "/api/v2/auth/me", undefined, initialized.json().token, "203.0.113.20"))
        .statusCode,
    ).toBe(200);

    expect(
      (
        await request(
          "POST",
          "/api/v2/auth/bootstrap-admin",
          {
            email: "second-admin@example.test",
            password: "Bootstrap!2026",
          },
          "",
          "203.0.113.21",
        )
      ).statusCode,
    ).toBe(409);
  });

  it("counts only failed logins and rate limits repeated invalid credentials", async () => {
    const password = "LoginPassword!2026";
    await prisma.user.update({
      where: { email: "owner@example.test" },
      data: { passwordHash: hashPassword(password) },
    });

    for (let attempt = 0; attempt < 7; attempt += 1) {
      expect(
        (
          await request(
            "POST",
            "/api/v2/auth/login",
            { email: "owner@example.test", password: "wrong-password" },
            "",
            "203.0.113.30",
          )
        ).statusCode,
      ).toBe(401);
    }

    expect(
      (
        await request(
          "POST",
          "/api/v2/auth/login",
          { email: "owner@example.test", password },
          "",
          "203.0.113.30",
        )
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await request(
          "POST",
          "/api/v2/auth/login",
          { email: "owner@example.test", password: "wrong-password" },
          "",
          "203.0.113.30",
        )
      ).statusCode,
    ).toBe(401);

    for (let attempt = 0; attempt < 8; attempt += 1) {
      expect(
        (
          await request(
            "POST",
            "/api/v2/auth/login",
            { email: "missing-user@example.test", password: "wrong-password" },
            "",
            "203.0.113.31",
          )
        ).statusCode,
      ).toBe(401);
    }
    const blocked = await request(
      "POST",
      "/api/v2/auth/login",
      { email: "missing-user@example.test", password: "wrong-password" },
      "",
      "203.0.113.31",
    );
    expect(blocked.statusCode).toBe(429);
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
  });
});
