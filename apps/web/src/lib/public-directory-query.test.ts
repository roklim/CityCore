import { describe, expect, it } from "vitest";

import {
  readPublicDirectoryFilters,
  updatePublicDirectorySearchParams,
} from "./public-directory-query";

describe("public directory query params", () => {
  it("reads search and category from the URL", () => {
    expect(
      readPublicDirectoryFilters(new URLSearchParams("q=pizza&category=ristorazione")),
    ).toEqual({
      query: "pizza",
      category: "ristorazione",
    });
  });

  it("uses empty/default filters when params are missing", () => {
    expect(readPublicDirectoryFilters(new URLSearchParams())).toEqual({
      query: "",
      category: "all",
    });
  });

  it("updates filters while preserving unrelated query params", () => {
    const current = new URLSearchParams("ref=home&q=old&category=servizi");
    const next = updatePublicDirectorySearchParams(current, {
      query: "pizza bianca",
      category: "ristorazione",
    });
    expect(next.get("ref")).toBe("home");
    expect(next.get("q")).toBe("pizza bianca");
    expect(next.get("category")).toBe("ristorazione");
  });

  it("removes empty search and the default category", () => {
    const current = new URLSearchParams("q=pizza&category=ristorazione&ref=home");
    const next = updatePublicDirectorySearchParams(current, { query: "", category: "all" });
    expect(next.toString()).toBe("ref=home");
  });

  it("round-trips unicode text through URLSearchParams", () => {
    const next = updatePublicDirectorySearchParams(new URLSearchParams(), { query: "São Paulo" });
    expect(readPublicDirectoryFilters(next).query).toBe("São Paulo");
  });
});
