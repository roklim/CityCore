import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPublicCityEvents } from "./public-runtime";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("public city event runtime", () => {
  it("keeps a valid empty agenda distinct from an unavailable endpoint", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.citycore.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", items: [], page: 1, limit: 6, total: 0 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchPublicCityEvents("cagli storico", new Date("2030-01-01T00:00:00.000Z")),
    ).resolves.toEqual({ items: [], total: 0, unavailable: false });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.citycore.test/api/v2/public/cities/cagli%20storico/events?from=2030-01-01T00%3A00%3A00.000Z&page=1&limit=6",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
  });

  it("degrades only the agenda when its endpoint fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.citycore.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "error", error: "temporary failure" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(
      fetchPublicCityEvents("cagli", new Date("2030-01-01T00:00:00.000Z")),
    ).resolves.toEqual({ items: [], total: 0, unavailable: true });
  });
});
