"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { PublicCityBusinessCard } from "../../lib/public-runtime";
import {
  filterPublicBusinessesBySection,
  getPublicBusinessCategoryLabel,
  groupPublicBusinessesByCategory,
} from "../../lib/public-search";
import styles from "./context-gateway.module.css";

function BusinessCard({ business }: { business: PublicCityBusinessCard }) {
  return (
    <article className={styles.directoryCard}>
      <p className={styles.sectionKicker}>{business.categoryLabel}</p>
      <h4>{business.name}</h4>
      <p>{business.summary}</p>
      {business.area ? <p className={styles.directoryMeta}>{business.area}</p> : null}
      {business.services.length ? (
        <p className={styles.directoryServices}>
          <strong>Servizi:</strong> {business.services.slice(0, 3).join(" · ")}
        </p>
      ) : null}
      <Link className={styles.directoryLink} href={business.href}>
        Apri la scheda <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

export function CityBusinessDirectory({
  businesses,
  degraded,
}: {
  businesses: PublicCityBusinessCard[];
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
  const visibleSections = useMemo(
    () => groupPublicBusinessesByCategory(visibleBusinesses),
    [visibleBusinesses],
  );
  const ungroupedBusinesses = useMemo(
    () =>
      visibleBusinesses.filter((business) => !getPublicBusinessCategoryLabel(business.category)),
    [visibleBusinesses],
  );
  const hasQuery = query.trim().length > 0;
  const hasCategorySections = sections.length > 0;

  return (
    <section
      className={styles.directorySection}
      id="directory"
      aria-labelledby="city-directory-title"
    >
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionKicker}>Directory pubblica</p>
          <h2 id="city-directory-title">Esplora le attività</h2>
        </div>
        <span className={styles.directoryCount} aria-live="polite">
          {visibleBusinesses.length} {visibleBusinesses.length === 1 ? "risultato" : "risultati"}
        </span>
      </div>

      {degraded ? (
        <p className={styles.degradedState} role="status">
          Stai visualizzando contenuti dimostrativi: la directory live non è disponibile in questo
          momento.
        </p>
      ) : null}

      <div className={`${styles.searchShell} ${styles.directorySearch}`}>
        <label className={styles.srOnly} htmlFor="city-business-search">
          Cerca nella directory della città
        </label>
        <span className={styles.searchIcon} aria-hidden="true" />
        <input
          className={styles.searchInput}
          id="city-business-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca nome, servizio, descrizione o località"
          ref={searchInputRef}
          type="search"
          value={query}
        />
        {hasQuery ? (
          <button
            className={styles.clearSearchButton}
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
        <div className={styles.directoryFilters} aria-label="Sezioni attività" role="group">
          <button
            aria-pressed={activeSection === "all"}
            className={
              activeSection === "all" ? styles.directoryFilterActive : styles.directoryFilter
            }
            onClick={() => setActiveSection("all")}
            type="button"
          >
            Tutte le attività <span>{businesses.length}</span>
          </button>
          {sections.map((section) => (
            <button
              aria-pressed={activeSection === section.id}
              className={
                activeSection === section.id ? styles.directoryFilterActive : styles.directoryFilter
              }
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
        <div className={styles.directoryGroups}>
          {visibleSections.map((section) => (
            <section
              className={styles.directoryGroup}
              key={section.id}
              aria-labelledby={`section-${section.id}`}
            >
              <div className={styles.directoryGroupHeader}>
                <h3 id={`section-${section.id}`}>{section.label}</h3>
                <span>{section.businesses.length}</span>
              </div>
              <div className={styles.directoryGrid}>
                {section.businesses.map((business) => (
                  <BusinessCard business={business} key={business.slug} />
                ))}
              </div>
            </section>
          ))}
          {ungroupedBusinesses.length ? (
            <section className={styles.directoryGroup} aria-labelledby="section-all-businesses">
              <div className={styles.directoryGroupHeader}>
                <h3 id="section-all-businesses">Tutte le attività</h3>
                <span>{ungroupedBusinesses.length}</span>
              </div>
              <div className={styles.directoryGrid}>
                {ungroupedBusinesses.map((business) => (
                  <BusinessCard business={business} key={business.slug} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : hasQuery || activeSection !== "all" ? (
        <div className={styles.emptyState} role="status">
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
            Azzera la ricerca
          </button>
        </div>
      ) : (
        <p className={styles.emptyState} role="status">
          Non ci sono attività pubblicate in questa città.
        </p>
      )}
    </section>
  );
}
