"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();
  const cityNames = cities.map((city) => city.name);

  const goToCity = (slug: string) => {
    startTransition(() => {
      router.push(`/${slug}`);
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const match = findMatchingCitySlug(inputValue, cities);

    if (!match) {
      setStatusMessage("Scegli una citta attiva per continuare.");
      return;
    }

    setStatusMessage(null);
    goToCity(match);
  };

  const handleLocation = () => {
    if (!("geolocation" in navigator)) {
      setStatusMessage(getGeolocationFallbackMessage("unsupported"));
      return;
    }

    setStatusMessage("Verifico la disponibilità della posizione...");

    navigator.geolocation.getCurrentPosition(
      () => {
        // The public city contract intentionally does not expose geographic coordinates.
        // Do not infer a city from a local hardcoded map or transmit the user's position.
        setStatusMessage(getGeolocationFallbackMessage("unmapped"));
      },
      () => {
        setStatusMessage(getGeolocationFallbackMessage("denied"));
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
        <label className={styles.searchShell}>
          <span className={styles.searchIcon} aria-hidden="true" />
          <input
            aria-label="Cerca una città attiva"
            autoComplete="off"
            className={styles.searchInput}
            disabled={isPending}
            list="citycore-city-options"
            onChange={(event) => setInputValue(event.target.value)}
            placeholder={searchPlaceholder}
            type="search"
            value={inputValue}
          />
        </label>

        <button
          className={styles.locationButton}
          disabled={isPending}
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
          <span>{locationLabel}</span>
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
