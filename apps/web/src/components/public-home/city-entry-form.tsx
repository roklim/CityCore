"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { findMatchingCitySlug } from "../../lib/public-search";
import styles from "./context-gateway.module.css";

type CityOption = {
  slug: string;
  name: string;
};

export function CityEntryForm({
  cities,
  searchPlaceholder,
}: {
  cities: CityOption[];
  searchPlaceholder: string;
}) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cityNames = cities.map((city) => city.name);
  const hasCities = cities.length > 0;

  const goToCity = (slug: string) => {
    startTransition(() => {
      router.push(`/${slug}`);
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending || !hasCities) return;

    const match = findMatchingCitySlug(inputValue, cities);

    if (!match) {
      setStatusMessage("Scegli una città attiva per continuare.");
      searchInputRef.current?.focus();
      return;
    }

    setStatusMessage(null);
    goToCity(match);
  };

  return (
    <div className={styles.entryFormWrap}>
      <form className={styles.entryForm} onSubmit={handleSubmit} aria-label="Cerca una città">
        <div className={styles.searchShell}>
          <label className={styles.srOnly} htmlFor="citycore-city-search">
            Cerca una città attiva
          </label>
          <span className={styles.searchIcon} aria-hidden="true" />
          <input
            autoComplete="off"
            aria-describedby={
              statusMessage
                ? "citycore-city-search-help citycore-city-search-error"
                : "citycore-city-search-help"
            }
            aria-invalid={Boolean(statusMessage)}
            className={styles.searchInput}
            disabled={isPending || !hasCities}
            id="citycore-city-search"
            list="citycore-city-options"
            onChange={(event) => {
              setInputValue(event.target.value);
              setStatusMessage(null);
            }}
            placeholder={hasCities ? searchPlaceholder : "Nessuna città disponibile"}
            ref={searchInputRef}
            type="search"
            value={inputValue}
          />
          <button
            className={styles.searchSubmitButton}
            disabled={isPending || !hasCities}
            type="submit"
          >
            {isPending ? "Apro…" : hasCities ? "Vai alla città" : "Non disponibile"}
          </button>
        </div>
      </form>

      <p className={styles.entryStatus} id="citycore-city-search-help">
        {hasCities
          ? "Scrivi il nome oppure sceglilo dai suggerimenti."
          : "Non ci sono ancora città pubblicate."}
      </p>

      <datalist id="citycore-city-options">
        {cityNames.map((cityName) => (
          <option key={cityName} value={cityName} />
        ))}
      </datalist>

      {statusMessage ? (
        <p
          aria-live="polite"
          className={styles.entryStatus}
          id="citycore-city-search-error"
          role="alert"
        >
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
