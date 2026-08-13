"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { resolveCitySearch } from "../../lib/public-search";
import styles from "./context-gateway.module.css";

type CityOption = {
  slug: string;
  name: string;
};

export function CityEntryForm({ cities }: { cities: CityOption[] }) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingCityName, setPendingCityName] = useState("");
  const [isPending, startTransition] = useTransition();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const hasCities = cities.length > 0;

  useEffect(() => {
    if (!isPending) submittingRef.current = false;
  }, [isPending]);

  const goToCity = (slug: string, cityName: string) => {
    setPendingCityName(cityName);
    startTransition(() => {
      router.push(`/${slug}`);
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || isPending || !hasCities) return;

    const resolution = resolveCitySearch(inputValue, cities);

    if (resolution.status !== "match") {
      const message =
        resolution.status === "empty"
          ? "Scrivi il nome di una città."
          : resolution.status === "ambiguous"
            ? "Specifica il nome completo della città."
            : "Questa città non è ancora disponibile.";
      setStatusMessage(message);
      searchInputRef.current?.focus();
      return;
    }

    setStatusMessage(null);
    submittingRef.current = true;
    const selectedCity = cities.find((city) => city.slug === resolution.slug);
    goToCity(resolution.slug, selectedCity?.name ?? inputValue.trim());
  };

  return (
    <div className={styles.entryFormWrap}>
      <form className={styles.entryForm} onSubmit={handleSubmit} aria-busy={isPending} noValidate>
        <label className={styles.srOnly} htmlFor="citycore-city-search">
          Cerca una città
        </label>
        <div
          className={`${styles.searchShell}${statusMessage ? ` ${styles.searchShellInvalid}` : ""}`}
        >
          <span className={styles.searchIcon} aria-hidden="true" />
          <input
            autoComplete="off"
            aria-describedby={statusMessage ? "citycore-city-search-error" : undefined}
            aria-invalid={Boolean(statusMessage)}
            autoCapitalize="words"
            className={styles.searchInput}
            disabled={isPending || !hasCities}
            enterKeyHint="go"
            id="citycore-city-search"
            onChange={(event) => {
              setInputValue(event.target.value);
              setStatusMessage(null);
            }}
            placeholder="Cerca una città"
            ref={searchInputRef}
            required
            type="search"
            value={inputValue}
          />
          <button
            className={styles.searchSubmitButton}
            disabled={isPending || !hasCities}
            aria-label={isPending ? "Apertura della città in corso" : "Vai alla città"}
            type="submit"
          >
            <span>{isPending ? "Apro…" : "Vai"}</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>

      {statusMessage ? (
        <p className={styles.entryError} id="citycore-city-search-error" role="alert">
          {statusMessage}
        </p>
      ) : null}

      <span className={styles.srOnly} role="status" aria-live="polite">
        {isPending ? `Apertura di ${pendingCityName} in corso.` : ""}
      </span>
    </div>
  );
}
