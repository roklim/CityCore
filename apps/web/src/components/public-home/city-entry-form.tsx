"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { findMatchingCitySlug, getGeolocationFallbackMessage } from "../../lib/public-search";
import styles from "./context-gateway.module.css";

type CityOption = {
  slug: string;
  name: string;
};

export function CityEntryForm({
  cities,
  searchPlaceholder,
  locationLabel,
}: {
  cities: CityOption[];
  searchPlaceholder: string;
  locationLabel: string;
}) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cityNames = cities.map((city) => city.name);

  const goToCity = (slug: string) => {
    startTransition(() => {
      router.push(`/${slug}`);
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;

    const match = findMatchingCitySlug(inputValue, cities);

    if (!match) {
      setStatusMessage("Scegli una città attiva per continuare.");
      searchInputRef.current?.focus();
      return;
    }

    setStatusMessage(null);
    goToCity(match);
  };

  const handleLocation = () => {
    if (isPending || isLocating) return;

    if (!("geolocation" in navigator)) {
      setStatusMessage(getGeolocationFallbackMessage("unsupported"));
      return;
    }

    setIsLocating(true);
    setStatusMessage("Verifico la disponibilità della posizione...");

    navigator.geolocation.getCurrentPosition(
      () => {
        // The public city contract intentionally does not expose geographic coordinates.
        // Do not infer a city from a local hardcoded map or transmit the user's position.
        setStatusMessage(getGeolocationFallbackMessage("unmapped"));
        setIsLocating(false);
        searchInputRef.current?.focus();
      },
      () => {
        setStatusMessage(getGeolocationFallbackMessage("denied"));
        setIsLocating(false);
        searchInputRef.current?.focus();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 8000,
      },
    );
  };

  return (
    <div className={styles.entryFormWrap}>
      <form className={styles.entryForm} onSubmit={handleSubmit}>
        <div className={styles.searchShell}>
          <label className={styles.srOnly} htmlFor="citycore-city-search">
            Cerca una città attiva
          </label>
          <span className={styles.searchIcon} aria-hidden="true" />
          <input
            autoComplete="off"
            className={styles.searchInput}
            disabled={isPending}
            id="citycore-city-search"
            list="citycore-city-options"
            onChange={(event) => {
              setInputValue(event.target.value);
              setStatusMessage(null);
            }}
            placeholder={searchPlaceholder}
            ref={searchInputRef}
            type="search"
            value={inputValue}
          />
          <button className={styles.searchSubmitButton} disabled={isPending} type="submit">
            {isPending ? "Apro…" : "Cerca"}
          </button>
        </div>

        <button
          className={styles.locationButton}
          disabled={isPending || isLocating}
          onClick={handleLocation}
          type="button"
        >
          <svg
            aria-hidden="true"
            className={styles.locationIcon}
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17 3 9.7 10.3M17 3l-5 14-2.9-6.1L3 8l14-5Z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
          <span>{isLocating ? "Ricerca posizione…" : locationLabel}</span>
        </button>
      </form>

      <datalist id="citycore-city-options">
        {cityNames.map((cityName) => (
          <option key={cityName} value={cityName} />
        ))}
      </datalist>

      {statusMessage ? (
        <p aria-live="polite" className={styles.entryStatus}>
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
