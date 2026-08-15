import { describe, expect, it } from "vitest";
import { normalizeExternalUrl, normalizePhoneHref, resolvePublicSiteUrl } from "./public-links";

describe("public links", () => {
  it.each([
    ["https://example.com", "https://example.com/"],
    ["http://example.com/path", "http://example.com/path"],
    ["example.com", "https://example.com/"],
    ["www.example.com?q=1", "https://www.example.com/?q=1"],
  ])("normalizes %s", (value, expected) => expect(normalizeExternalUrl(value)).toBe(expected));
  it.each([
    "",
    "   ",
    "javascript:alert(1)",
    "data:text/html,x",
    "file:///tmp/x",
    "not a url",
    "https://demo.example.test/pizzeria",
  ])("rejects unsafe url %s", (value) => expect(normalizeExternalUrl(value)).toBeNull());
  it("normalizes an international phone number", () =>
    expect(normalizePhoneHref("+39 (070) 123-4567")).toBe("tel:+390701234567"));
  it.each(["", "call me"])("rejects invalid phone %s", (value) =>
    expect(normalizePhoneHref(value)).toBeNull(),
  );

  it("uses the configured public site URL in production", () => {
    expect(
      resolvePublicSiteUrl(
        "https://citycore.example.org",
        "production",
        "ignored.vercel.app",
      )?.toString(),
    ).toBe("https://citycore.example.org/");
  });

  it("uses the Vercel production domain when no explicit site URL is configured", () => {
    expect(
      resolvePublicSiteUrl(undefined, "production", "citycore-web.vercel.app")?.toString(),
    ).toBe("https://citycore-web.vercel.app/");
  });

  it("falls back to localhost only in development", () => {
    expect(resolvePublicSiteUrl(undefined, "development")?.toString()).toBe(
      "http://localhost:3000/",
    );
    expect(resolvePublicSiteUrl(undefined, "production")).toBeNull();
  });

  it("rejects invalid or unsafe public site URLs", () => {
    expect(resolvePublicSiteUrl("javascript:alert(1)", "production")).toBeNull();
    expect(resolvePublicSiteUrl("not a URL", "production")).toBeNull();
  });
});
