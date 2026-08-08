import { describe, expect, it } from "vitest";

import { getFallbackBusinessProfile, getFallbackCityProfile } from "./public-marketplace";

describe("editorial degraded routes", () => {
  it("keeps only known fallback cities reachable", () => {
    expect(getFallbackCityProfile("cagli")?.slug).toBe("cagli");
    expect(getFallbackCityProfile("account")).toBeNull();
    expect(getFallbackCityProfile("citta-inesistente")).toBeNull();
  });

  it("keeps only known fallback businesses reachable", () => {
    expect(getFallbackBusinessProfile("cagli", "bottega-civica")?.name).toBe("Bottega Civica");
    expect(getFallbackBusinessProfile("cagli", "attivita-inesistente")).toBeNull();
    expect(getFallbackBusinessProfile("citta-inesistente", "attivita")).toBeNull();
  });
});
