import { describe, expect, it } from "vitest";
import { getAdminAuthErrorMessage } from "./admin-auth-errors";
import { PlatformApiError } from "./platform-api";

describe("admin authentication errors", () => {
  it("does not expose raw API authentication messages", () => {
    expect(
      getAdminAuthErrorMessage(new PlatformApiError("Invalid credentials", 401, null), "Errore"),
    ).toBe("Email o password non corrette.");
    expect(
      getAdminAuthErrorMessage(new PlatformApiError("internal detail", 500, null), "Errore"),
    ).toBe("Il servizio di accesso non è disponibile. Riprova tra qualche istante.");
  });

  it("explains inactive accounts and rate limits in Italian", () => {
    expect(
      getAdminAuthErrorMessage(new PlatformApiError("Account is not active", 403, null), "Errore"),
    ).toContain("password temporanea");
    expect(
      getAdminAuthErrorMessage(new PlatformApiError("Rate limit", 429, null), "Errore"),
    ).toContain("Troppi tentativi");
  });

  it("uses the caller fallback for non-API failures", () => {
    expect(getAdminAuthErrorMessage(new Error("network detail"), "Accesso non riuscito.")).toBe(
      "Accesso non riuscito.",
    );
  });
});
