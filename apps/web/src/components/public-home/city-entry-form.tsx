"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styles from "./context-gateway.module.css";

type CityOption = {
  slug: string;
  name: string;
};

const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  bologna: { lat: 44.4949, lng: 11.3426 },
  rimini: { lat: 44.0678, lng: 12.5695 },
  firenze: { lat: 43.7696, lng: 11.2558 },
  cagli: { lat: 43.5479, lng: 12.6489 },
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function findCitySlug(query: string, cities: CityOption[]) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return null;
  }

  const exact = cities.find(
    (city) =>
      normalizeText(city.name) === normalizedQuery || normalizeText(city.slug) === normalizedQuery,
  );

  if (exact) {
    return exact.slug;
  }

  const partial = cities.find(
    (city) =>
      normalizeText(city.name).includes(normalizedQuery) ||
      normalizeText(city.slug).includes(normalizedQuery),
  );

  return partial?.slug ?? null;
}

function getNearestCity(
  current: { lat: number; lng: number },
  cities: CityOption[],
): CityOption | null {
  let bestMatch: CityOption | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const city of cities) {
    const coordinates = cityCoordinates[city.slug];

    if (!coordinates) {
      continue;
    }

    const distance =
      Math.abs(current.lat - coordinates.lat) + Math.abs(current.lng - coordinates.lng);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = city;
    }
  }

  return bestMatch;
}

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

    const match = findCitySlug(inputValue, cities);

    if (!match) {
      setStatusMessage("Scegli una citta attiva per continuare.");
      return;
    }

    setStatusMessage(null);
    goToCity(match);
  };

  const handleLocation = () => {
    if (!("geolocation" in navigator)) {
      setStatusMessage("La posizione non e disponibile su questo dispositivo.");
      return;
    }

    setStatusMessage("Sto cercando la citta piu vicina...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = getNearestCity(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          cities,
        );

        if (!nearest) {
          setStatusMessage("Non ho trovato una citta attiva abbastanza vicina.");
          return;
        }

        setStatusMessage(null);
        goToCity(nearest.slug);
      },
      () => {
        setStatusMessage("Non riesco a leggere la tua posizione. Scegli una citta attiva.");
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
