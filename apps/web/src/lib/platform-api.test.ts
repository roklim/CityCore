import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPlatformApi } from "./platform-api";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("platform API transport", () => {
  it("normalizes native timeout failures into a regular application error", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.citycore.test");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("native timeout"), { name: "TimeoutError" })),
    );

    await expect(fetchPlatformApi("/health", { timeoutMs: 125 })).rejects.toThrow(
      "Platform API request timed out after 125ms.",
    );
  });
});
