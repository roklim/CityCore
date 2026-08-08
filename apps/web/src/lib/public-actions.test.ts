import { describe, expect, it } from "vitest";

import { getCityMobileNavigation, getPublicBusinessPrimaryAction } from "./public-actions";

describe("getPublicBusinessPrimaryAction", () => {
  const contacts = {
    inquiryAvailable: true,
    phoneHref: "tel:+390721000101",
    emailHref: "mailto:locale@example.org",
    website: "https://example.org",
  };

  it("prioritizes pickup ordering when it is usable", () => {
    expect(getPublicBusinessPrimaryAction({ ...contacts, pickupOrderAvailable: true })).toEqual({
      label: "Ordina e ritira",
      heading: "Ordina per il ritiro",
      href: "#order",
    });
  });

  it("uses the inquiry when ordering is unavailable", () => {
    expect(getPublicBusinessPrimaryAction({ ...contacts, pickupOrderAvailable: false })).toEqual({
      label: "Invia una richiesta",
      heading: "Invia una richiesta",
      href: "#contact",
    });
  });

  it("falls back through real contacts and finally services", () => {
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

describe("getCityMobileNavigation", () => {
  it("always sends Home to the global home and keeps contextual destinations dynamic", () => {
    expect(getCityMobileNavigation("cagli")).toEqual([
      { label: "Home", href: "/", icon: "home" },
      {
        label: "Attività",
        href: "/cagli#directory",
        icon: "places",
        current: "location",
      },
      { label: "Operatori", href: "/admin/login", icon: "profile" },
    ]);
  });

  it("encodes dynamic city slugs", () => {
    expect(getCityMobileNavigation("città nuova")[1]?.href).toBe("/citt%C3%A0%20nuova#directory");
  });
});
