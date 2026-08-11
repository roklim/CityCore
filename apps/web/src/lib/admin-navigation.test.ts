import { describe, expect, it } from "vitest";
import type { AuthAccess } from "./platform-api";
import { adminRoleLabel, adminStatusLabel, auditActionLabel } from "./admin-labels";
import { getBusinessAdminNavigation, getPlatformAdminNavigation } from "./admin-navigation";
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

describe("admin navigation", () => {
  it("exposes all platform sections and marks only the current route", () => {
    const items = getPlatformAdminNavigation(access("platform"), "/admin/businesses", true);

    expect(items.map((item) => item.href)).toEqual([
      "/admin",
      "/admin/cities",
      "/admin/businesses",
      "/admin/access",
      "/admin/audit",
      "/",
      "/select-access",
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
      businessName: "Forno Civico",
      businessPath: "/cagli/forno-civico",
      cityPath: "/cagli",
      isPublished: false,
      hasMultipleAccesses: false,
    };

    expect(getBusinessAdminNavigation({ ...common, access: access("platform") })[0]?.href).toBe(
      "/admin/businesses",
    );
    expect(getBusinessAdminNavigation({ ...common, access: access("business") })[0]?.href).toBe(
      "#overview",
    );
  });

  it("offers the public page only for a published business", () => {
    const common = {
      access: access("business"),
      businessName: "Forno Civico",
      businessPath: "/cagli/forno-civico",
      cityPath: "/cagli",
      hasMultipleAccesses: false,
    };

    expect(
      getBusinessAdminNavigation({ ...common, isPublished: false }).some(
        (item) => item.href === common.businessPath,
      ),
    ).toBe(false);
    expect(
      getBusinessAdminNavigation({ ...common, isPublished: true }).some(
        (item) => item.href === common.businessPath,
      ),
    ).toBe(true);
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
