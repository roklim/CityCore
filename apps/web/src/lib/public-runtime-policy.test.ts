import { describe, expect, it } from "vitest";

import { shouldUseEditorialFallback } from "./public-runtime-policy";

describe("editorial fallback policy", () => {
  it("keeps editorial fallbacks available by default during local development", () => {
    expect(shouldUseEditorialFallback("development", undefined)).toBe(true);
    expect(shouldUseEditorialFallback("test", undefined)).toBe(true);
  });

  it("fails closed by default in production", () => {
    expect(shouldUseEditorialFallback("production", undefined)).toBe(false);
  });

  it("allows an explicit production demo override", () => {
    expect(shouldUseEditorialFallback("production", "true")).toBe(true);
    expect(shouldUseEditorialFallback("production", " TRUE ")).toBe(true);
  });

  it("honors an explicit disable and treats unknown values as disabled", () => {
    expect(shouldUseEditorialFallback("development", "false")).toBe(false);
    expect(shouldUseEditorialFallback("development", "yes")).toBe(false);
  });
});
