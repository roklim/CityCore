"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { PublicCityBusinessCard } from "../../lib/public-runtime";
import {
  filterPublicBusinessesBySection,
  getPublicBusinessCategories,
  groupPublicBusinessesByCategory,
} from "../../lib/public-search";
import styles from "./context-gateway.module.css";

function BusinessCard({ business }: { business: PublicCityBusinessCard }) {
  const categories = getPublicBusinessCategories(business);
  return (
    <article className={`${styles.directoryCard} public-business-card`}>
      <p className={`${styles.sectionKicker} public-business-card-category`}>
        {categories.map((category) => category.label).join(" · ") || business.categoryLabel}
      </p>
      <h3 className="public-business-card-title">{business.name}</h3>
      {business.area ? (
        <p className={`${styles.directoryMeta} public-business-card-meta`}>{business.area}</p>
      ) : null}
      <p className="public-business-card-description">{business.summary}</p>
      {business.services.length ? (
        <p className={`${styles.directoryServices} public-business-card-services`}>
          <strong>Servizi:</strong> {business.services.slice(0, 3).join(" · ")}
        </p>
      ) : null}
      <Link className={`${styles.directoryLink} public-business-card-link`} href={business.href}>
        <span>Scopri {business.name}</span> <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
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
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState("all");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sections = useMemo(() => groupPublicBusinessesByCategory(businesses), [businesses]);
  const visibleBusinesses = useMemo(
    () => filterPublicBusinessesBySection(businesses, query, activeSection),
    [activeSection, businesses, query],
  );
  const hasQuery = query.trim().length > 0;
  const hasCategorySections = sections.length > 0;

  return (
    <section
      className={`${styles.directorySection} public-directory`}
      id="directory"
      aria-labelledby="city-directory-title"
    >
      <div className={`${styles.sectionHeader} public-directory-header`}>
        <div>
          <p className={styles.sectionKicker}>Attività locali</p>
          <h2 id="city-directory-title">Trova quello che cerchi</h2>
        </div>
        <span
          className={`${styles.directoryCount} public-directory-count`}
          id="city-directory-count"
          aria-live="polite"
        >
          {visibleBusinesses.length}{" "}
          {visibleBusinesses.length === 1 ? "attività trovata" : "attività trovate"}
        </span>
      </div>

      {degraded ? (
        <p className={`${styles.degradedState} public-directory-degraded`} role="status">
          Stai visualizzando contenuti dimostrativi: la directory live non è disponibile in questo
          momento.
        </p>
      ) : null}

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
          placeholder="Cerca per nome, servizio o zona"
          ref={searchInputRef}
          type="search"
          value={query}
        />
        {hasQuery ? (
          <button
            className={`${styles.clearSearchButton} public-directory-clear`}
            onClick={() => {
              setQuery("");
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
            onClick={() => setActiveSection("all")}
            type="button"
          >
            Tutte le attività <span>{businesses.length}</span>
          </button>
          {sections.map((section) => (
            <button
              aria-pressed={activeSection === section.id}
              className={`${
                activeSection === section.id ? styles.directoryFilterActive : styles.directoryFilter
              } public-directory-filter${activeSection === section.id ? " is-active" : ""}`}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              {section.label} <span>{section.businesses.length}</span>
            </button>
          ))}
        </div>
      ) : null}

      {visibleBusinesses.length ? (
        <div className={`${styles.directoryGrid} public-directory-grid`} id="city-business-results">
          {visibleBusinesses.map((business) => (
            <BusinessCard business={business} key={business.slug} />
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
          Non ci sono ancora attività pubblicate a {cityName}.{" "}
          <Link href="/#citycore-city-search">Scegli un'altra città</Link>.
        </p>
      )}
    </section>
  );
}
