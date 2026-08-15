import { describe, expect, it } from "vitest";
import {
  cityRegistryMatchRank,
  compareCityRegistryMatches,
  normalizeCityRegistryQuery,
} from "../../src/platform-core/city-registry-search.js";

describe("city registry search", () => {
  it("normalizes accents and punctuation for global lookup", () => {
    expect(normalizeCityRegistryQuery("  São-Paulo, BR ")).toBe("sao paulo br");
    expect(normalizeCityRegistryQuery("L'Aquila")).toBe("l aquila");
  });

  it("ranks exact matches before prefixes", () => {
    expect(cityRegistryMatchRank({ name: "Roma", asciiName: "Rome" }, "rome")).toBe(0);
    expect(cityRegistryMatchRank({ name: "New York", asciiName: "New York" }, "new")).toBe(1);
  });

  it("uses population as a tie breaker for equally relevant places", () => {
    const query = "springfield";
    const large = { name: "Springfield", asciiName: "Springfield", population: 100_000 };
    const small = { name: "Springfield", asciiName: "Springfield", population: 20_000 };
    expect(compareCityRegistryMatches(large, small, query)).toBeLessThan(0);
  });
});
