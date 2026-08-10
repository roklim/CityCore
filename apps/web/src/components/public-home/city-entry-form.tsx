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
