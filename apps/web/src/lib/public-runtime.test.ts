import { describe, expect, it } from "vitest";

import {
  chooseHomepageCityCards,
  formatPublicBusinessLocation,
  getPublicBusinessDisplayName,
} from "./public-runtime";

describe("getPublicBusinessDisplayName", () => {
  it("uses the owner-managed public title when available", () => {
    expect(getPublicBusinessDisplayName({ name: "Legal name", publicTitle: "Public name" })).toBe(
      "Public name",
    );
  });

  it("falls back to the canonical business name", () => {
    expect(getPublicBusinessDisplayName({ name: "Legal name", publicTitle: "  " })).toBe(
      "Legal name",
    );
  });
});

describe("homepage live-data selection", () => {
  const fallback = [
    {
      name: "Città demo",
      slug: "demo",
      claim: "Demo",
      shortPitch: "Demo",
      businessCount: 1,
      href: "/demo",
    },
  ];

  it("keeps a successful empty live catalog empty", () => {
    expect(chooseHomepageCityCards([], fallback, false)).toEqual([]);
  });

  it("uses editorial fallback cards only when the API is degraded", () => {
    expect(chooseHomepageCityCards([], fallback, true)).toEqual(fallback);
  });
});

describe("public business location", () => {
  it("keeps both address lines and the postal code without empty separators", () => {
    expect(
      formatPublicBusinessLocation({
        addressLine: "Via Roma 1",
        addressLine2: "Scala B",
        postalCode: "61043",
        locality: "Cagli",
        province: "PU",
      }),
    ).toBe("Via Roma 1, Scala B, 61043 Cagli, PU");
  });

  it("omits unavailable address fragments", () => {
    expect(
      formatPublicBusinessLocation({
        addressLine: null,
        addressLine2: null,
        postalCode: null,
        locality: "Cagli",
        province: null,
      }),
    ).toBe("Cagli");
  });
});
