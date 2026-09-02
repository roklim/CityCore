import { describe, expect, it } from "vitest";
import {
  createPublicBusinessNormalizedCorpus,
  createPublicBusinessSearchIndex,
  createPublicBusinessSearchIndexFromCorpus,
  filterPublicBusinesses,
  filterPublicBusinessesBySection,
  findMatchingCitySlug,
  getCitySearchSuggestions,
  getPublicBusinessCategoryLabel,
  groupPublicBusinessesByCategory,
  groupPublicBusinessesForDisplay,
  normalizeSearchText,
  resolveCitySearch,
  searchPreNormalizedPublicBusinesses,
  searchPublicBusinesses,
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

  it("does not choose a city when a partial name is ambiguous", () => {
    const cities = [
      { slug: "san-luca", name: "San Luca" },
      { slug: "san-pietro", name: "San Pietro" },
    ];

    expect(findMatchingCitySlug("San", cities)).toBeNull();
    expect(findMatchingCitySlug("San Luca", cities)).toBe("san-luca");
  });

  it("does not choose a city when a normalized exact name is duplicated", () => {
    const cities = [
      { slug: "san-luca-nord", name: "San Luca" },
      { slug: "san-luca-sud", name: "San Luca" },
    ];

    expect(findMatchingCitySlug("San Luca", cities)).toBeNull();
  });

  it("distinguishes empty, unavailable and ambiguous city searches", () => {
    const cities = [
      { slug: "san-luca", name: "San Luca" },
      { slug: "san-pietro", name: "San Pietro" },
    ];

    expect(resolveCitySearch("", cities)).toEqual({ status: "empty" });
    expect(resolveCitySearch("Rimini", cities)).toEqual({ status: "unavailable" });
    expect(resolveCitySearch("San", cities)).toEqual({ status: "ambiguous" });
    expect(resolveCitySearch("Luca", cities)).toEqual({ status: "match", slug: "san-luca" });
  });

  it("keeps submit matching consistent with the suggestion thresholds", () => {
    const cities = [{ slug: "cagli", name: "Cagli" }];

    expect(resolveCitySearch("c", cities)).toEqual({ status: "unavailable" });
    expect(resolveCitySearch("ag", cities)).toEqual({ status: "unavailable" });
    expect(resolveCitySearch("ca", cities)).toEqual({ status: "match", slug: "cagli" });
  });

  it("does not prioritize an exact slug over multiple visible suggestions", () => {
    const cities = [
      { slug: "roma", name: "Capitale" },
      { slug: "romagna", name: "Romanengo" },
    ];

    expect(getCitySearchSuggestions("roma", cities).items.map((city) => city.name)).toEqual([
      "Romanengo",
      "Capitale",
    ]);
    expect(resolveCitySearch("roma", cities)).toEqual({ status: "ambiguous" });
  });

  it("does not suggest cities before two normalized characters", () => {
    const cities = [{ slug: "cagli", name: "Cagli" }];

    expect(getCitySearchSuggestions("", cities)).toEqual({
      items: [],
      total: 0,
      truncated: false,
    });
    expect(getCitySearchSuggestions(" c ", cities)).toEqual({
      items: [],
      total: 0,
      truncated: false,
    });
    expect(getCitySearchSuggestions(" ca ", cities).items).toEqual(cities);
  });

  it("ranks exact, name prefix, word prefix, contains and slug fallback matches", () => {
    const cities = [
      { slug: "zona-roma", name: "Capitale" },
      { slug: "aromatica", name: "Aromatica" },
      { slug: "santa-roma", name: "Santa Roma" },
      { slug: "romagna", name: "Romagna" },
      { slug: "roma", name: "Roma" },
    ];

    expect(getCitySearchSuggestions("roma", cities, 10).items.map((city) => city.name)).toEqual([
      "Roma",
      "Romagna",
      "Santa Roma",
      "Aromatica",
      "Capitale",
    ]);
  });

  it("normalizes accents and recognizes word prefixes after Italian punctuation", () => {
    const cities = [
      { slug: "citta-di-castello", name: "Città di Castello" },
      { slug: "laquila", name: "L'Aquila" },
    ];

    expect(getCitySearchSuggestions("citta", cities).items.map((city) => city.slug)).toEqual([
      "citta-di-castello",
    ]);
    expect(getCitySearchSuggestions("aqu", cities).items.map((city) => city.slug)).toEqual([
      "laquila",
    ]);
    expect(resolveCitySearch("L'Aquila", [{ slug: "l-aquila", name: "L’Aquila" }])).toEqual({
      status: "match",
      slug: "l-aquila",
    });
    expect(
      resolveCitySearch("citta-di-castello", [
        { slug: "citta-di-castello", name: "Città di Castello" },
      ]),
    ).toEqual({ status: "match", slug: "citta-di-castello" });
  });

  it("allows two-character prefixes but requires three characters for contains matches", () => {
    const cities = [
      { slug: "cagli", name: "Cagli" },
      { slug: "porto-rosa", name: "Porto Rosa" },
    ];

    expect(getCitySearchSuggestions("ca", cities).items.map((city) => city.name)).toEqual([
      "Cagli",
    ]);
    expect(getCitySearchSuggestions("ag", cities).items).toEqual([]);
    expect(getCitySearchSuggestions("osa", cities).items.map((city) => city.name)).toEqual([
      "Porto Rosa",
    ]);
  });

  it("uses the slug only as the last ranking fallback", () => {
    const cities = [
      { slug: "san-luca-centro", name: "Centro storico" },
      { slug: "san-luca", name: "San Luca" },
    ];

    expect(getCitySearchSuggestions("luca", cities).items.map((city) => city.name)).toEqual([
      "San Luca",
      "Centro storico",
    ]);
  });

  it("sorts equal-ranked suggestions alphabetically in Italian", () => {
    const cities = [
      { slug: "caltagirone", name: "Caltagirone" },
      { slug: "cagli", name: "Cagli" },
      { slug: "camerino", name: "Camerino" },
    ];

    expect(getCitySearchSuggestions("ca", cities).items.map((city) => city.name)).toEqual([
      "Cagli",
      "Caltagirone",
      "Camerino",
    ]);
  });

  it("deduplicates normalized slugs after ranking and preserves extra city data", () => {
    const cities = [
      { slug: "cagli", name: "Cagli centro", businessCount: 2 },
      { slug: "CAGLI", name: "Cagli", businessCount: 4 },
    ];

    expect(getCitySearchSuggestions("cagli", cities)).toEqual({
      items: [{ slug: "CAGLI", name: "Cagli", businessCount: 4 }],
      total: 1,
      truncated: false,
    });
  });

  it("applies the default and custom limits and reports total and truncation", () => {
    const cities = Array.from({ length: 7 }, (_, index) => ({
      slug: `casa-${index + 1}`,
      name: `Casa ${index + 1}`,
    }));

    expect(getCitySearchSuggestions("ca", cities)).toMatchObject({ total: 7, truncated: true });
    expect(getCitySearchSuggestions("ca", cities).items).toHaveLength(5);
    expect(getCitySearchSuggestions("ca", cities, 2)).toEqual({
      items: cities.slice(0, 2),
      total: 7,
      truncated: true,
    });
    expect(getCitySearchSuggestions("ca", cities, 10)).toEqual({
      items: cities,
      total: 7,
      truncated: false,
    });
  });

  it("handles zero, fractional and non-finite limits deterministically", () => {
    const cities = [
      { slug: "cagli", name: "Cagli" },
      { slug: "camerino", name: "Camerino" },
    ];

    expect(getCitySearchSuggestions("ca", cities, 0)).toEqual({
      items: [],
      total: 2,
      truncated: true,
    });
    expect(getCitySearchSuggestions("ca", cities, 1.9).items).toEqual([cities[0]]);
    expect(getCitySearchSuggestions("ca", cities, Number.POSITIVE_INFINITY).items).toEqual(cities);
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

  it("keeps pre-normalized and trigram searches equivalent to the linear baseline", () => {
    const businesses = [
      {
        name: "Forno Civico",
        summary: "Impasti del giorno",
        category: "commerce",
        categoryLabel: "Attività locali",
        categories: [{ id: "cat-pizza", name: "Pizzerìa", slug: "pizza" }],
        area: "Centro storico",
        searchTerms: ["Margherita", "Pizza vegetariana"],
      },
      {
        name: "Studio Aurora",
        summary: "Servizi professionali",
        category: "service",
        categoryLabel: "Servizi",
        categories: [{ id: "cat-studio", name: "Professionisti", slug: "professionisti" }],
        area: "Porta Massara",
        searchTerms: ["Primo incontro"],
      },
      {
        name: "Casa del Borgo",
        summary: "Ospitalità nel centro",
        category: "hospitality",
        categoryLabel: "Ospitalità",
        categories: [],
        area: "Cagli",
        searchTerms: ["Richiesta soggiorno"],
      },
    ];
    const corpus = createPublicBusinessNormalizedCorpus(businesses);
    const index = createPublicBusinessSearchIndexFromCorpus(corpus);

    for (const query of ["", "p", "pi", "pizza", "PIZZERIA", "aurora", "porta mass", "zz"]) {
      expect(searchPreNormalizedPublicBusinesses(corpus, query)).toEqual(
        filterPublicBusinessesBySection(businesses, query, "all"),
      );
      expect(searchPublicBusinesses(index, query)).toEqual(
        filterPublicBusinessesBySection(businesses, query, "all"),
      );
    }

    for (const sectionId of ["pizza", "professionisti", "hospitality", "missing"]) {
      expect(searchPreNormalizedPublicBusinesses(corpus, "", sectionId)).toEqual(
        filterPublicBusinessesBySection(businesses, "", sectionId),
      );
      expect(searchPublicBusinesses(index, "", sectionId)).toEqual(
        filterPublicBusinessesBySection(businesses, "", sectionId),
      );
    }

    expect(searchPreNormalizedPublicBusinesses(corpus, "margherita", "pizza")).toEqual([
      businesses[0],
    ]);
    expect(searchPublicBusinesses(index, "margherita", "pizza")).toEqual([businesses[0]]);
    expect(searchPreNormalizedPublicBusinesses(corpus, "margherita", "professionisti")).toEqual([]);
    expect(searchPublicBusinesses(index, "margherita", "professionisti")).toEqual([]);
  });

  it("does not create cross-field matches and reports deterministic index statistics", () => {
    const businesses = [
      {
        name: "Alfa",
        summary: "Beta",
        category: "service",
        categoryLabel: "Servizi",
        categories: [{ id: "cat-service", name: "Servizi", slug: "servizi" }],
        area: "Centro",
        searchTerms: ["Gamma"],
      },
    ];
    const index = createPublicBusinessSearchIndex(businesses);

    expect(searchPublicBusinesses(index, "alfa beta")).toEqual([]);
    expect(index.stats).toMatchObject({
      itemCount: 1,
      normalizedFieldCount: 6,
      postingCount: expect.any(Number),
      trigramCount: expect.any(Number),
    });
    expect(index.stats.postingCount).toBeGreaterThanOrEqual(index.stats.trigramCount);
  });
});
