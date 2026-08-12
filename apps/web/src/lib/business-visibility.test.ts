import { describe, expect, it } from "vitest";
import { isBusinessPublic } from "./business-visibility";

function business(
  status: "draft" | "active" | "paused" | "disabled",
  cityStatus: "active" | "coming_soon" | "disabled",
  cityActive: boolean,
) {
  return {
    status,
    city: { status: cityStatus, active: cityActive },
  } as Parameters<typeof isBusinessPublic>[0];
}

describe("business visibility", () => {
  it("requires both the business and its city to be public", () => {
    expect(isBusinessPublic(business("active", "active", true))).toBe(true);
    expect(isBusinessPublic(business("active", "active", false))).toBe(false);
    expect(isBusinessPublic(business("active", "coming_soon", true))).toBe(false);
    expect(isBusinessPublic(business("draft", "active", true))).toBe(false);
  });
});
