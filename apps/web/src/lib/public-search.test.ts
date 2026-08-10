import { describe, expect, it } from "vitest";
import {
  filterPublicBusinesses,
  filterPublicBusinessesBySection,
  findMatchingCitySlug,
  getPublicBusinessCategoryLabel,
  groupPublicBusinessesByCategory,
  groupPublicBusinessesForDisplay,
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

  it("falls back to template categories in canonical order when assignments are absent", () => {
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

  it("groups a business with one assigned city category", () => {
    const business = {
      name: "Forno Civico",
      summary: "Pizza di quartiere",
      category: "commerce",
      categoryLabel: "Local Business",
      categories: [{ id: "cat-pizza", name: "Pizza", slug: "pizza" }],
      area: "Centro",
    };

    expect(groupPublicBusinessesByCategory([business])).toEqual([
      { id: "pizza", label: "Pizza", businesses: [business] },
    ]);
  });

  it("groups a business under all of its assigned categories", () => {
    const business = {
      name: "Forno Civico",
      summary: "Pizza da asporto",
      category: "commerce",
      categoryLabel: "Local Business",
      categories: [
        { id: "cat-restaurant", name: "Ristorante", slug: "ristorante" },
        { id: "cat-takeaway", name: "Asporto", slug: "asporto" },
      ],
      area: "Centro",
    };

    expect(
      groupPublicBusinessesByCategory([business])
        .map((section) => section.id)
        .sort(),
    ).toEqual(["asporto", "ristorante"]);
    expect(groupPublicBusinessesForDisplay([business], "all")).toHaveLength(1);
  });

  it("filters a multi-category business by its first category", () => {
    const business = {
      name: "Forno Civico",
      summary: "Pizza da asporto",
      category: "commerce",
      categoryLabel: "Local Business",
      categories: [
        { id: "cat-restaurant", name: "Ristorante", slug: "ristorante" },
        { id: "cat-takeaway", name: "Asporto", slug: "asporto" },
      ],
      area: "Centro",
    };

    expect(filterPublicBusinessesBySection([business], "", "ristorante")).toEqual([business]);
  });

  it("filters a multi-category business by its second category", () => {
    const business = {
      name: "Forno Civico",
      summary: "Pizza da asporto",
      category: "commerce",
      categoryLabel: "Local Business",
      categories: [
        { id: "cat-restaurant", name: "Ristorante", slug: "ristorante" },
        { id: "cat-takeaway", name: "Asporto", slug: "asporto" },
      ],
      area: "Centro",
    };

    expect(filterPublicBusinessesBySection([business], "", "asporto")).toEqual([business]);
  });

  it("keeps a business without assignments or template category uncategorized", () => {
    const business = {
      name: "Spazio civico",
      summary: "Informazioni locali",
      category: null,
      categoryLabel: "Custom",
      categories: [],
      area: "Centro",
    };

    expect(groupPublicBusinessesByCategory([business])).toEqual([]);
    expect(filterPublicBusinessesBySection([business], "", "all")).toEqual([business]);
  });

  it("combines text search with a real assigned category", () => {
    const businesses = [
      {
        name: "Forno Civico",
        summary: "Impasti del giorno",
        category: "commerce",
        categoryLabel: "Local Business",
        categories: [{ id: "cat-pizza", name: "Pizza", slug: "pizza" }],
        area: "Centro",
        searchTerms: ["Margherita"],
      },
      {
        name: "Bottega Verde",
        summary: "Prodotti locali",
        category: "commerce",
        categoryLabel: "Local Business",
        categories: [{ id: "cat-shop", name: "Negozi", slug: "negozi" }],
        area: "Centro",
        searchTerms: ["Margherita"],
      },
    ];

    expect(filterPublicBusinessesBySection(businesses, "margherita", "pizza")).toEqual([
      businesses[0],
    ]);
  });
});
