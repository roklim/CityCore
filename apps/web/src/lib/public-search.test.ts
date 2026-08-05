import { describe, expect, it } from "vitest";
import {
  filterPublicBusinesses,
  filterPublicBusinessesBySection,
  findMatchingCitySlug,
  getGeolocationFallbackMessage,
  getPublicBusinessCategoryLabel,
  groupPublicBusinessesByCategory,
  normalizeSearchText,
} from "./public-search";

describe("public search", () => {
  it("normalizes accents and repeated spaces", () => {
    expect(normalizeSearchText("  Città   d'Èstate ")).toBe("citta d'estate");
  });

  it("finds active cities by exact and partial names", () => {
    const cities = [
      { slug: "cagli", name: "Cagli" },
      { slug: "bologna", name: "Bologna" },
    ];

    expect(findMatchingCitySlug("BOL", cities)).toBe("bologna");
    expect(findMatchingCitySlug("cagli", cities)).toBe("cagli");
    expect(findMatchingCitySlug("Rimini", cities)).toBeNull();
  });

  it("filters by business, locality, description and real service names", () => {
    const businesses = [
      {
        name: "Officina Verde",
        summary: "Riparazioni e manutenzione",
        categoryLabel: "Servizi",
        area: "Centro",
        searchTerms: ["Taglio capelli"],
      },
      {
        name: "Casa Blu",
        summary: "Ospitalità nel borgo",
        categoryLabel: "Soggiorni",
        area: "Porta Nuova",
      },
    ];

    expect(filterPublicBusinesses(businesses, "capelli")).toHaveLength(1);
    expect(filterPublicBusinesses(businesses, "porta")[0]?.name).toBe("Casa Blu");
    expect(filterPublicBusinesses(businesses, "")).toEqual(businesses);
  });

  it("uses a transparent manual fallback after geolocation", () => {
    expect(getGeolocationFallbackMessage("unmapped")).toContain("Scegli una città attiva");
  });

  it("groups real template categories in the canonical product order", () => {
    const businesses = [
      {
        name: "Agenda Cagli",
        summary: "Eventi locali",
        category: "editorial",
        categoryLabel: "Events & Listings",
        area: "Centro",
      },
      {
        name: "Studio Aurora",
        summary: "Servizi professionali",
        category: "service",
        categoryLabel: "Studio Service",
        area: "Porta Massara",
      },
      {
        name: "Bottega Civica",
        summary: "Vetrina locale",
        category: "commerce",
        categoryLabel: "Local Business",
        area: "Centro storico",
      },
    ];

    expect(groupPublicBusinessesByCategory(businesses).map((section) => section.label)).toEqual([
      "Attività locali",
      "Servizi",
      "Eventi e annunci",
    ]);
  });

  it("combines section and text filters without inventing a category", () => {
    const businesses = [
      {
        name: "Studio Aurora",
        summary: "Servizi professionali",
        category: "service",
        categoryLabel: "Studio Service",
        area: "Porta Massara",
      },
      {
        name: "Casa Blu",
        summary: "Ospitalità nel borgo",
        category: "hospitality",
        categoryLabel: "Hospitality",
        area: "Centro",
      },
    ];

    expect(filterPublicBusinessesBySection(businesses, "aurora", "service")).toHaveLength(1);
    expect(filterPublicBusinessesBySection(businesses, "aurora", "hospitality")).toHaveLength(0);
    expect(filterPublicBusinessesBySection(businesses, "", "all")).toHaveLength(2);
    expect(getPublicBusinessCategoryLabel("unknown")).toBeNull();
  });

  it("finds the pizzeria by a real service and keeps it in its real section", () => {
    const businesses = [
      {
        name: "Forno Civico",
        summary: "Pizzeria di quartiere con impasti del giorno.",
        category: "commerce",
        categoryLabel: "Local Business",
        area: "Cagli",
        searchTerms: ["Pizza Margherita", "Pizza vegetariana", "Pizza del Forno"],
      },
      {
        name: "Studio Aurora",
        summary: "Servizi professionali su appuntamento.",
        category: "service",
        categoryLabel: "Studio Service",
        area: "Porta Massara",
      },
    ];

    expect(filterPublicBusinessesBySection(businesses, "pizza", "commerce")).toEqual([
      businesses[0],
    ]);
    expect(filterPublicBusinessesBySection(businesses, "pizza", "service")).toEqual([]);
  });

  it("keeps the all-activities fallback when no reliable category is available", () => {
    const businesses = [
      {
        name: "Scheda senza categoria",
        summary: "Informazioni pubbliche",
        category: null,
        categoryLabel: "Custom",
        area: "Centro",
      },
    ];

    expect(groupPublicBusinessesByCategory(businesses)).toEqual([]);
    expect(filterPublicBusinessesBySection(businesses, "", "all")).toEqual(businesses);
  });
});
