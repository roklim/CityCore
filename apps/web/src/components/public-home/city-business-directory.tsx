"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PublicCityBusinessCard } from "../../lib/public-runtime";
import {
  createPublicBusinessSearchIndex,
  getPublicBusinessCategories,
  groupPublicBusinessesByCategory,
  minimumPublicSearchSuggestionQueryLength,
  normalizeSearchText,
  searchPublicBusinesses,
} from "../../lib/public-search";
import {
  readPublicDirectoryFilters,
  updatePublicDirectorySearchParams,
  type PublicDirectoryFilters,
} from "../../lib/public-directory-query";
import { demoVisualLabel, getDemoBusinessVisual } from "./city-demo-visuals";
import showcaseStyles from "./city-showcase.module.css";
import styles from "./context-gateway.module.css";

function initials(value: string) {
  return value
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function BusinessCard({ business, index }: { business: PublicCityBusinessCard; index: number }) {
  const categories = getPublicBusinessCategories(business);
  const categoryLabel =
    categories.map((category) => category.label).join(" · ") || business.categoryLabel;

  return (
    <article className={`${styles.directoryCard} public-business-card`}>
      <div
        className={showcaseStyles.directoryVisual}
        role="img"
        aria-label={`${demoVisualLabel} per ${business.name}`}
        style={{ backgroundImage: `url("${getDemoBusinessVisual(business, index)}")` }}
      >
        <span className={showcaseStyles.demoBadge}>{demoVisualLabel}</span>
      </div>

      <div className={showcaseStyles.directoryCardBody}>
        <div className="public-business-card-head">
          <span className="public-business-card-monogram" aria-hidden="true">
            {initials(business.name)}
          </span>
          <div>
            <p className={`${styles.sectionKicker} public-business-card-category`}>
              {categoryLabel}
            </p>
          </div>
        </div>
        <h3 className="public-business-card-title">{business.name}</h3>
        <p className="public-business-card-description">{business.summary}</p>
        {business.services.length ? (
          <ul className="public-business-card-service-list" aria-label="Servizi in evidenza">
            {business.services.slice(0, 3).map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
        ) : null}
        <Link
          aria-label={`Apri la scheda di ${business.name}`}
          className={`${styles.directoryLink} public-business-card-link`}
          href={business.href}
        >
          <span>Apri la scheda</span> <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

function directoryHref(pathname: string, searchParams: URLSearchParams) {
  const queryString = searchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

type DirectorySuggestion =
  | { kind: "business"; business: PublicCityBusinessCard }
  | { kind: "category"; id: string; label: string; count: number };

export function CityBusinessDirectory({
  businesses,
  cityName,
  degraded,
}: {
  businesses: PublicCityBusinessCard[];
  cityName: string;
  degraded: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const listboxId = `${useId().replaceAll(":", "")}-directory-suggestions`;
  const sections = useMemo(() => groupPublicBusinessesByCategory(businesses), [businesses]);
  const businessSearchIndex = useMemo(
    () => createPublicBusinessSearchIndex(businesses),
    [businesses],
  );
  const urlFilters = useMemo(
    () => readPublicDirectoryFilters(new URLSearchParams(searchParamsKey)),
    [searchParamsKey],
  );
  const normalizeCategory = (category: string) =>
    category === "all" || sections.some((section) => section.id === category) ? category : "all";
  const [query, setQuery] = useState(urlFilters.query);
  const [activeSection, setActiveSection] = useState(normalizeCategory(urlFilters.category));
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const blurFrameRef = useRef<number | null>(null);
  const pointerSelectingRef = useRef(false);
  const visibleBusinesses = useMemo(
    () => searchPublicBusinesses(businessSearchIndex, query, activeSection),
    [activeSection, businessSearchIndex, query],
  );
  const normalizedQuery = normalizeSearchText(query);
  const hasQuery = normalizedQuery.length > 0;
  const hasCategorySections = sections.length > 0;
  const hasSuggestionQuery = normalizedQuery.length >= minimumPublicSearchSuggestionQueryLength;
  const directorySuggestions = useMemo<DirectorySuggestion[]>(() => {
    if (!hasSuggestionQuery) return [];

    const businessSuggestions: DirectorySuggestion[] = visibleBusinesses
      .slice(0, 4)
      .map((business) => ({
        kind: "business",
        business,
      }));
    const categorySuggestions: DirectorySuggestion[] = sections
      .filter((section) => normalizeSearchText(section.label).includes(normalizedQuery))
      .slice(0, 2)
      .map((section) => ({
        kind: "category",
        id: section.id,
        label: section.label,
        count: section.businesses.length,
      }));

    return [...businessSuggestions, ...categorySuggestions];
  }, [hasSuggestionQuery, normalizedQuery, sections, visibleBusinesses]);
  const suggestionsVisible = suggestionsOpen && hasSuggestionQuery;
  const listboxVisible = suggestionsVisible && directorySuggestions.length > 0;
  const activeSuggestion =
    activeSuggestionIndex >= 0 ? directorySuggestions[activeSuggestionIndex] : undefined;
  const activeSuggestionId =
    listboxVisible && activeSuggestion ? `${listboxId}-option-${activeSuggestionIndex}` : undefined;

  useEffect(() => {
    const filters = readPublicDirectoryFilters(new URLSearchParams(searchParamsKey));
    setQuery(filters.query);
    setActiveSection(normalizeCategory(filters.category));
  }, [searchParamsKey, sections]);

  useEffect(() => {
    setActiveSuggestionIndex(-1);
  }, [activeSection, query]);

  useEffect(() => {
    const current = readPublicDirectoryFilters(new URLSearchParams(searchParamsKey));
    if (current.query === query.trim()) return;

    const timer = window.setTimeout(() => {
      const next = updatePublicDirectorySearchParams(new URLSearchParams(searchParamsKey), {
        query,
      });
      window.history.replaceState(null, "", directoryHref(pathname, next));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [pathname, query, searchParamsKey]);

  useEffect(
    () => () => {
      if (blurFrameRef.current !== null) cancelAnimationFrame(blurFrameRef.current);
    },
    [],
  );

  function updateUrl(changes: Partial<PublicDirectoryFilters>, mode: "push" | "replace") {
    const next = updatePublicDirectorySearchParams(new URLSearchParams(searchParamsKey), changes);
    const href = directoryHref(pathname, next);
    if (mode === "push") window.history.pushState(null, "", href);
    else window.history.replaceState(null, "", href);
  }

  function closeSuggestions() {
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
  }

  function selectCategory(category: string) {
    setActiveSection(category);
    closeSuggestions();
    updateUrl({ query, category }, "push");
  }

  function chooseSuggestion(suggestion: DirectorySuggestion) {
    if (blurFrameRef.current !== null) {
      cancelAnimationFrame(blurFrameRef.current);
      blurFrameRef.current = null;
    }
    pointerSelectingRef.current = false;

    closeSuggestions();
    if (suggestion.kind === "business") {
      router.push(suggestion.business.href);
      return;
    }

    setQuery("");
    setActiveSection(suggestion.id);
    updateUrl({ query: "", category: suggestion.id }, "push");
    searchInputRef.current?.focus();
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && directorySuggestions.length > 0) {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestionIndex((current) =>
        current < 0 ? 0 : Math.min(current + 1, directorySuggestions.length - 1),
      );
      return;
    }

    if (event.key === "ArrowUp" && directorySuggestions.length > 0) {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestionIndex((current) =>
        current < 0 ? directorySuggestions.length - 1 : Math.max(current - 1, 0),
      );
      return;
    }

    if (event.key === "Enter" && listboxVisible && activeSuggestion) {
      event.preventDefault();
      chooseSuggestion(activeSuggestion);
      return;
    }

    if (event.key === "Escape" && suggestionsVisible) {
      event.preventDefault();
      closeSuggestions();
      return;
    }

    if (event.key === "Tab") closeSuggestions();
  }

  return (
    <section
      className={`${styles.directorySection} public-directory`}
      id="directory"
      aria-labelledby="city-directory-title"
    >
      <div className={`${styles.sectionHeader} public-directory-header`}>
        <div>
          <p className={styles.sectionKicker}>Trova quello che ti serve</p>
          <h2 id="city-directory-title">Attività e servizi</h2>
        </div>
        <span
          className={`${styles.directoryCount} public-directory-count`}
          id="city-directory-count"
          aria-live="polite"
        >
          {visibleBusinesses.length} {visibleBusinesses.length === 1 ? "risultato" : "risultati"}
        </span>
      </div>

      {degraded ? (
        <p className={`${styles.degradedState} public-directory-degraded`} role="status">
          Stai visualizzando contenuti dimostrativi: la directory live non è disponibile in questo
          momento.
        </p>
      ) : null}

      <div className="public-directory-commandbar">
        <div
          className={`${styles.searchComposer}${suggestionsVisible ? ` ${styles.searchComposerOpen}` : ""}`}
        >
          <div
            className={`${styles.searchShell} ${styles.directorySearch} public-directory-search`}
          >
            <label className={styles.srOnly} htmlFor="city-business-search">
              Cerca tra le attività a {cityName}
            </label>
            <span className={styles.searchIcon} aria-hidden="true" />
            <input
              aria-activedescendant={activeSuggestionId}
              aria-autocomplete="list"
              aria-controls={listboxVisible ? listboxId : "city-business-results"}
              aria-describedby="city-directory-count"
              aria-expanded={listboxVisible}
              autoComplete="off"
              className={styles.searchInput}
              id="city-business-search"
              onBlur={() => {
                blurFrameRef.current = requestAnimationFrame(() => {
                  blurFrameRef.current = null;
                  if (!pointerSelectingRef.current) closeSuggestions();
                  pointerSelectingRef.current = false;
                });
              }}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                setSuggestionsOpen(
                  normalizeSearchText(nextQuery).length >= minimumPublicSearchSuggestionQueryLength,
                );
              }}
              onFocus={() => {
                if (hasSuggestionQuery) setSuggestionsOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Cerca attività, servizio o categoria"
              ref={searchInputRef}
              role="combobox"
              type="search"
              value={query}
            />
            {hasQuery ? (
              <button
                className={`${styles.clearSearchButton} public-directory-clear`}
                onClick={() => {
                  setQuery("");
                  closeSuggestions();
                  updateUrl({ query: "", category: activeSection }, "replace");
                  searchInputRef.current?.focus();
                }}
                type="button"
              >
                Cancella
              </button>
            ) : null}
          </div>

          {suggestionsVisible ? (
            <div className={styles.suggestionsPanel}>
              {directorySuggestions.length ? (
                <ul
                  aria-label="Risultati suggeriti"
                  className={styles.suggestionsList}
                  id={listboxId}
                  role="listbox"
                >
                  {directorySuggestions.map((suggestion, index) => {
                    const isActive = index === activeSuggestionIndex;
                    const optionId = `${listboxId}-option-${index}`;
                    const key =
                      suggestion.kind === "business"
                        ? `business-${suggestion.business.slug}`
                        : `category-${suggestion.id}`;
                    const label =
                      suggestion.kind === "business" ? suggestion.business.name : suggestion.label;
                    const qualifier =
                      suggestion.kind === "business"
                        ? getPublicBusinessCategories(suggestion.business)
                            .map((category) => category.label)
                            .join(" · ") || suggestion.business.categoryLabel
                        : `Categoria · ${suggestion.count} ${suggestion.count === 1 ? "risultato" : "risultati"}`;

                    return (
                      <li
                        aria-selected={isActive}
                        className={`${styles.suggestionOption}${isActive ? ` ${styles.suggestionOptionActive}` : ""}`}
                        id={optionId}
                        key={key}
                        onClick={() => chooseSuggestion(suggestion)}
                        onPointerDown={() => {
                          pointerSelectingRef.current = true;
                        }}
                        role="option"
                      >
                        <span className={styles.suggestionName}>{label}</span>
                        <span className={styles.suggestionQualifier}>{qualifier}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className={styles.suggestionsEmpty} role="status">
                  <strong>Nessun risultato suggerito</strong>
                  <span>Continua a scrivere o modifica la ricerca.</span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {hasCategorySections ? (
          <div
            className={`${styles.directoryFilters} public-directory-filters`}
            aria-label="Filtra per categoria"
            role="group"
          >
            <button
              aria-pressed={activeSection === "all"}
              className={`${
                activeSection === "all" ? styles.directoryFilterActive : styles.directoryFilter
              } public-directory-filter${activeSection === "all" ? " is-active" : ""}`}
              onClick={() => selectCategory("all")}
              type="button"
            >
              Tutte <span>{businesses.length}</span>
            </button>
            {sections.map((section) => (
              <button
                aria-pressed={activeSection === section.id}
                className={`${
                  activeSection === section.id
                    ? styles.directoryFilterActive
                    : styles.directoryFilter
                } public-directory-filter${activeSection === section.id ? " is-active" : ""}`}
                key={section.id}
                onClick={() => selectCategory(section.id)}
                type="button"
              >
                {section.label} <span>{section.businesses.length}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {visibleBusinesses.length ? (
        <div className={`${styles.directoryGrid} public-directory-grid`} id="city-business-results">
          {visibleBusinesses.map((business, index) => (
            <BusinessCard business={business} index={index} key={business.slug} />
          ))}
        </div>
      ) : hasQuery || activeSection !== "all" ? (
        <div
          className={`${styles.emptyState} public-directory-empty`}
          id="city-business-results"
          role="status"
        >
          <p>Nessuna attività corrisponde ai filtri selezionati.</p>
          <button
            className={styles.resetSearchButton}
            onClick={() => {
              setQuery("");
              setActiveSection("all");
              closeSuggestions();
              updateUrl({ query: "", category: "all" }, "push");
              searchInputRef.current?.focus();
            }}
            type="button"
          >
            Rimuovi ricerca e filtri
          </button>
        </div>
      ) : (
        <p
          className={`${styles.emptyState} public-directory-empty`}
          id="city-business-results"
          role="status"
        >
          Non ci sono ancora attività pubblicate.{" "}
          <Link href="/#citycore-city-search">Scegli un'altra città</Link>.
        </p>
      )}
    </section>
  );
}
