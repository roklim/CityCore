"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicCityBusinessCard } from "../../lib/public-runtime";
import {
  filterPublicBusinessesBySection,
  getPublicBusinessCategories,
  groupPublicBusinessesByCategory,
} from "../../lib/public-search";
import {
  readPublicDirectoryFilters,
  updatePublicDirectorySearchParams,
  type PublicDirectoryFilters,
} from "../../lib/public-directory-query";
import {
  demoVisualLabel,
  getDemoBusinessVisual,
} from "./city-demo-visuals";
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
            {business.locality ? (
              <span className={showcaseStyles.directoryLocation}>{business.locality}</span>
            ) : null}
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
  const sections = useMemo(() => groupPublicBusinessesByCategory(businesses), [businesses]);
  const urlFilters = useMemo(
    () => readPublicDirectoryFilters(new URLSearchParams(searchParamsKey)),
    [searchParamsKey],
  );
  const normalizeCategory = (category: string) =>
    category === "all" || sections.some((section) => section.id === category) ? category : "all";
  const [query, setQuery] = useState(urlFilters.query);
  const [activeSection, setActiveSection] = useState(normalizeCategory(urlFilters.category));
  const searchInputRef = useRef<HTMLInputElement>(null);
  const visibleBusinesses = useMemo(
    () => filterPublicBusinessesBySection(businesses, query, activeSection),
    [activeSection, businesses, query],
  );
  const hasQuery = query.trim().length > 0;
  const hasCategorySections = sections.length > 0;

  useEffect(() => {
    const filters = readPublicDirectoryFilters(new URLSearchParams(searchParamsKey));
    setQuery(filters.query);
    setActiveSection(normalizeCategory(filters.category));
  }, [searchParamsKey, sections]);

  useEffect(() => {
    const current = readPublicDirectoryFilters(new URLSearchParams(searchParamsKey));
    if (current.query === query.trim()) return;

    const timer = window.setTimeout(() => {
      const next = updatePublicDirectorySearchParams(new URLSearchParams(searchParamsKey), {
        query,
      });
      router.replace(directoryHref(pathname, next), { scroll: false });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [pathname, query, router, searchParamsKey]);

  function updateUrl(changes: Partial<PublicDirectoryFilters>, mode: "push" | "replace") {
    const next = updatePublicDirectorySearchParams(new URLSearchParams(searchParamsKey), changes);
    const href = directoryHref(pathname, next);
    if (mode === "push") router.push(href, { scroll: false });
    else router.replace(href, { scroll: false });
  }

  function selectCategory(category: string) {
    setActiveSection(category);
    updateUrl({ query, category }, "push");
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
          {visibleBusinesses.length}{" "}
          {visibleBusinesses.length === 1 ? "risultato" : "risultati"}
        </span>
      </div>

      {degraded ? (
        <p className={`${styles.degradedState} public-directory-degraded`} role="status">
          Stai visualizzando contenuti dimostrativi: la directory live non è disponibile in questo
          momento.
        </p>
      ) : null}

      <div className="public-directory-commandbar">
        <div className={`${styles.searchShell} ${styles.directorySearch} public-directory-search`}>
          <label className={styles.srOnly} htmlFor="city-business-search">
            Cerca tra le attività a {cityName}
          </label>
          <span className={styles.searchIcon} aria-hidden="true" />
          <input
            className={styles.searchInput}
            aria-controls="city-business-results"
            aria-describedby="city-directory-count"
            id="city-business-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca per nome, servizio o categoria"
            ref={searchInputRef}
            type="search"
            value={query}
          />
          {hasQuery ? (
            <button
              className={`${styles.clearSearchButton} public-directory-clear`}
              onClick={() => {
                setQuery("");
                updateUrl({ query: "", category: activeSection }, "replace");
                searchInputRef.current?.focus();
              }}
              type="button"
            >
              Cancella
            </button>
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
