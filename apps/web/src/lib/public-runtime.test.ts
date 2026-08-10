import { describe, expect, it } from "vitest";

import { getPublicBusinessDisplayName } from "./public-runtime";

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
