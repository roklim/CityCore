import { describe, expect, it } from "vitest";

const databaseUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!databaseUrl)("integration database guard", () => {
  it("accepts only an explicitly named test database", () => {
    expect(databaseUrl).toMatch(/test/i);
    expect(databaseUrl).not.toContain("citycore?schema=public");
  });
});
