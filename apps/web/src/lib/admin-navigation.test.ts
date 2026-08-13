import { describe, expect, it } from "vitest";
import type { AuthAccess, PlatformBusiness } from "./platform-api";
import { adminRoleLabel, adminStatusLabel, auditActionLabel } from "./admin-labels";
import { getPlatformAdminNavigation } from "./admin-navigation";
import { getBusinessAdminNavigation } from "./business-admin-navigation";
import { pageHref, positivePage, queryString } from "./admin-query";

function access(scopeType: AuthAccess["scopeType"]): AuthAccess {
  return {
    id: `access-${scopeType}`,
    role:
      scopeType === "platform"
        ? "global_admin"
        : scopeType === "city"
          ? "city_admin"
          : "local_admin",
    scopeType,
    cityId: scopeType === "platform" ? null : "city-1",
    businessId: scopeType === "business" ? "business-1" : null,
    lastUsedAt: null,
    createdAt: "2026-08-11T00:00:00.000Z",
    updatedAt: "2026-08-11T00:00:00.000Z",
    permissions: [],
    city:
      scopeType === "platform"
        ? null
        : { id: "city-1", name: "Cagli", slug: "cagli", status: "active" },
    business:
      scopeType === "business"
        ? {
            id: "business-1",
            name: "Forno Civico",
            slug: "forno-civico",
            status: "active",
            city: { id: "city-1", name: "Cagli", slug: "cagli", status: "active" },
          }
        : null,
  };
}

function business(
  status: PlatformBusiness["status"] = "draft",
  withCatalog = true,
): PlatformBusiness {
  return {
    id: "business-1",
    name: "Forno Civico",
    slug: "forno-civico",
    legalName: null,
    category: null,
    status,
    plan: "free",
    subscriptionStatus: "trialing",
    publicEmail: null,
    publicPhone: null,
    website: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    locality: null,
    province: null,
    socialLinks: null,
    timezone: "Europe/Rome",
    currency: "EUR",
    locale: "it-IT",
    primaryColor: null,
    accentColor: null,
    publicTitle: null,
    publicSubtitle: null,
    publicDescription: null,
    seoTitle: null,
    seoDescription: null,
    bookingPolicy: null,
    cancellationPolicy: null,
    notesInternal: null,
    city: { id: "city-1", name: "Cagli", slug: "cagli", status: "active", active: true },
    template: {
      id: "template-1",
      code: "local-business",
      name: "Attività locale",
      category: "local",
      primaryModule: "profile",
      defaultCtaLabel: null,
    },
    modules: withCatalog ? [{ moduleCode: "catalog", active: true }] : [],
    owner: null,
    createdAt: "2026-08-11T00:00:00.000Z",
    updatedAt: "2026-08-11T00:00:00.000Z",
  };
}

describe("admin navigation", () => {
  it("exposes platform sections without duplicating the header access switcher", () => {
    const items = getPlatformAdminNavigation(access("platform"), "/admin/businesses", true);

    expect(items.map((item) => item.href)).toEqual([
      "/admin",
      "/admin/cities",
      "/admin/businesses",
      "/admin/access",
      "/admin/audit",
      "/",
    ]);
    expect(items.filter((item) => item.current).map((item) => item.href)).toEqual([
      "/admin/businesses",
    ]);
  });

  it("does not expose the platform navigation to a business scope", () => {
    expect(getPlatformAdminNavigation(access("business"), "/admin", false)).toEqual([]);
  });

  it("adds the activities return path only for platform and city operators", () => {
    const common = {
      business: business(),
      currentPath: "/cagli/forno-civico/admin",
      hasMultipleAccesses: false,
    };
    const platformItems = getBusinessAdminNavigation({ ...common, access: access("platform") });
    const businessItems = getBusinessAdminNavigation({ ...common, access: access("business") });

    expect(platformItems.some((item) => item.href === "/admin/businesses")).toBe(true);
    expect(businessItems.some((item) => item.href === "/admin/businesses")).toBe(false);
    expect(businessItems[0]?.href).toBe("/cagli/forno-civico/admin");
  });

  it("offers the public page only for a published business", () => {
    const common = {
      access: access("business"),
      currentPath: "/cagli/forno-civico/admin",
      hasMultipleAccesses: false,
    };

    expect(
      getBusinessAdminNavigation({ ...common, business: business("draft") }).some(
        (item) => item.href === "/cagli/forno-civico",
      ),
    ).toBe(false);
    expect(
      getBusinessAdminNavigation({ ...common, business: business("active") }).some(
        (item) => item.href === "/cagli/forno-civico",
      ),
    ).toBe(true);
  });

  it("uses real routed sections and hides pickup orders without the catalog module", () => {
    const items = getBusinessAdminNavigation({
      access: access("business"),
      business: business("draft", false),
      currentPath: "/cagli/forno-civico/admin/services",
      hasMultipleAccesses: false,
    });

    expect(items.some((item) => item.href.startsWith("#"))).toBe(false);
    expect(items.find((item) => item.href.endsWith("/services"))?.current).toBe(true);
    expect(items.some((item) => item.href.endsWith("/orders"))).toBe(false);
  });
});

describe("admin query and labels", () => {
  it("preserves filters while changing a named pagination parameter", () => {
    expect(pageHref("/admin/cities", { q: "cagli", status: "active" }, 3, "registryPage")).toBe(
      "/admin/cities?q=cagli&status=active&registryPage=3",
    );
  });

  it("omits empty values and normalizes invalid pages", () => {
    expect(queryString({ q: "", status: undefined, page: 2 })).toBe("page=2");
    expect(positivePage("0")).toBe(1);
    expect(positivePage("2")).toBe(2);
  });

  it("translates visible statuses, roles and known audit actions", () => {
    expect(adminStatusLabel("draft")).toBe("Bozza");
    expect(adminRoleLabel("city_admin")).toBe("Amministratore città");
    expect(auditActionLabel("platform.city.created")).toBe("Città creata");
  });
});
