import { describe, expect, it } from "vitest";

import { getPublicBusinessPrimaryAction } from "./public-actions";

describe("getPublicBusinessPrimaryAction", () => {
  const contacts = {
    inquiryAvailable: true,
    phoneHref: "tel:+390721000101",
    emailHref: "mailto:locale@example.org",
    website: "https://example.org",
  };

  it("prioritizes a usable pickup order over informational actions", () => {
    expect(getPublicBusinessPrimaryAction({ ...contacts, pickupOrderAvailable: true })).toEqual({
      label: "Ordina ora",
      heading: "Ordina e ritira",
      href: "#order",
    });
  });

  it("uses inquiry when ordering is unavailable", () => {
    expect(getPublicBusinessPrimaryAction({ ...contacts, pickupOrderAvailable: false })).toEqual({
      label: "Invia una richiesta",
      heading: "Invia una richiesta",
      href: "#inquiry-form",
    });
  });

  it("falls back through real contacts and finally services", () => {
    expect(
      getPublicBusinessPrimaryAction({
        pickupOrderAvailable: true,
        inquiryAvailable: false,
        phoneHref: "tel:+390721000101",
        emailHref: null,
        website: null,
      }),
    ).toEqual({ label: "Ordina ora", heading: "Ordina e ritira", href: "#order" });
    expect(
      getPublicBusinessPrimaryAction({
        pickupOrderAvailable: false,
        inquiryAvailable: false,
        phoneHref: "tel:+390721000101",
        emailHref: null,
        website: null,
      }).label,
    ).toBe("Chiama");
    expect(
      getPublicBusinessPrimaryAction({
        pickupOrderAvailable: false,
        inquiryAvailable: false,
        phoneHref: null,
        emailHref: "mailto:locale@example.org",
        website: null,
      }).label,
    ).toBe("Scrivi");
    expect(
      getPublicBusinessPrimaryAction({
        pickupOrderAvailable: false,
        inquiryAvailable: false,
        phoneHref: null,
        emailHref: null,
        website: "https://example.org",
      }),
    ).toMatchObject({ label: "Visita il sito", external: true });
    expect(
      getPublicBusinessPrimaryAction({
        pickupOrderAvailable: false,
        inquiryAvailable: false,
        phoneHref: null,
        emailHref: null,
        website: null,
      }).href,
    ).toBe("#services");
  });
});
