"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import {
  getCitySearchSuggestions,
  minimumPublicSearchSuggestionQueryLength,
  normalizeCitySearchText,
  resolveCitySearch,
} from "../../lib/public-search";
import styles from "./context-gateway.module.css";

type CityOption = {
  slug: string;
  name: string;
  qualifier?: string | null;
};

function getHighlightRange(value: string, query: string) {
  const normalizedQuery = normalizeCitySearchText(query);
  if (!normalizedQuery) return null;

  let normalizedValue = "";
  const sourceIndexes: number[] = [];

  for (let sourceIndex = 0; sourceIndex < value.length; sourceIndex += 1) {
    const normalizedCharacter = value[sourceIndex]
      ?.normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("it-IT");

    for (const character of normalizedCharacter ?? "") {
      const normalizedSeparator = /[\s'’`´\-‐‑‒–—―/]/u.test(character) ? " " : character;
      if (normalizedSeparator === " " && (!normalizedValue || normalizedValue.endsWith(" "))) {
        continue;
      }
      normalizedValue += normalizedSeparator;
      sourceIndexes.push(sourceIndex);
    }
  }

  if (normalizedValue.endsWith(" ")) {
    normalizedValue = normalizedValue.slice(0, -1);
    sourceIndexes.pop();
  }

  const normalizedStart = normalizedValue.indexOf(normalizedQuery);
  if (normalizedStart < 0) return null;

  const start = sourceIndexes[normalizedStart];
  const end = sourceIndexes[normalizedStart + normalizedQuery.length - 1];
  return start === undefined || end === undefined ? null : { start, end: end + 1 };
}

function HighlightedCityName({ name, query }: { name: string; query: string }) {
  const range = getHighlightRange(name, query);
  if (!range) return name;

  return (
    <>
      {name.slice(0, range.start)}
      <mark>{name.slice(range.start, range.end)}</mark>
      {name.slice(range.end)}
    </>
  );
}

export function CityEntryForm({ cities }: { cities: CityOption[] }) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingCityName, setPendingCityName] = useState("");
  const [isPending, startTransition] = useTransition();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const submittingRef = useRef(false);
  const isComposingRef = useRef(false);
  const pointerSelectingRef = useRef(false);
  const blurFrameRef = useRef<number | null>(null);
  const pointerReleaseFrameRef = useRef<number | null>(null);
  const suppressSubmitRef = useRef(false);
  const suppressSubmitFrameRef = useRef<number | null>(null);
  const listboxId = `${useId().replaceAll(":", "")}-city-suggestions`;
  const hasCities = cities.length > 0;
  const suggestions = useMemo(
    () => getCitySearchSuggestions(inputValue, cities),
    [cities, inputValue],
  );
  const hasSuggestionQuery =
    normalizeCitySearchText(inputValue).length >= minimumPublicSearchSuggestionQueryLength;
  const suggestionsVisible = suggestionsOpen && hasSuggestionQuery && !isPending;
  const listboxVisible = suggestionsVisible && suggestions.items.length > 0;
  const activeSuggestion =
    activeSuggestionIndex >= 0 ? suggestions.items[activeSuggestionIndex] : undefined;
  const activeSuggestionId =
    listboxVisible && activeSuggestion ? `${listboxId}-option-${activeSuggestionIndex}` : undefined;

  useEffect(() => {
    if (!isPending) submittingRef.current = false;
  }, [isPending]);

  useEffect(() => {
    setActiveSuggestionIndex(-1);
    optionRefs.current = [];
  }, [cities, inputValue]);

  useEffect(() => {
    if (!listboxVisible || activeSuggestionIndex < 0) return;
    optionRefs.current[activeSuggestionIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeSuggestionIndex, listboxVisible]);

  useEffect(
    () => () => {
      if (blurFrameRef.current !== null) cancelAnimationFrame(blurFrameRef.current);
      if (pointerReleaseFrameRef.current !== null) {
        cancelAnimationFrame(pointerReleaseFrameRef.current);
      }
      if (suppressSubmitFrameRef.current !== null) {
        cancelAnimationFrame(suppressSubmitFrameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const releasePointerSelection = () => {
      if (!pointerSelectingRef.current) return;
      pointerSelectingRef.current = false;
      pointerReleaseFrameRef.current = requestAnimationFrame(() => {
        pointerReleaseFrameRef.current = null;
        if (document.activeElement !== searchInputRef.current) {
          setSuggestionsOpen(false);
          setActiveSuggestionIndex(-1);
        }
      });
    };

    document.addEventListener("pointerup", releasePointerSelection);
    document.addEventListener("pointercancel", releasePointerSelection);

    return () => {
      document.removeEventListener("pointerup", releasePointerSelection);
      document.removeEventListener("pointercancel", releasePointerSelection);
    };
  }, []);

  const cancelPendingBlur = () => {
    if (blurFrameRef.current === null) return;
    cancelAnimationFrame(blurFrameRef.current);
    blurFrameRef.current = null;
  };

  const suppressImmediateSubmit = () => {
    suppressSubmitRef.current = true;
    if (suppressSubmitFrameRef.current !== null) {
      cancelAnimationFrame(suppressSubmitFrameRef.current);
    }
    suppressSubmitFrameRef.current = requestAnimationFrame(() => {
      suppressSubmitRef.current = false;
      suppressSubmitFrameRef.current = null;
    });
  };

  const closeSuggestions = () => {
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
  };

  const goToCity = (slug: string, cityName: string) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPendingCityName(cityName);
    closeSuggestions();
    startTransition(() => {
      router.push(`/${slug}`);
    });
  };

  const selectSuggestion = (city: CityOption) => {
    cancelPendingBlur();
    setInputValue(city.name);
    setSelectedSlug(city.slug);
    setStatusMessage(null);
    goToCity(city.slug, city.name);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    cancelPendingBlur();
    if (suppressSubmitRef.current) {
      suppressSubmitRef.current = false;
      if (suppressSubmitFrameRef.current !== null) {
        cancelAnimationFrame(suppressSubmitFrameRef.current);
        suppressSubmitFrameRef.current = null;
      }
      return;
    }
    if (submittingRef.current || isPending || isComposingRef.current || !hasCities) return;

    const selectedCity = selectedSlug
      ? cities.find(
          (city) =>
            city.slug === selectedSlug &&
            normalizeCitySearchText(city.name) === normalizeCitySearchText(inputValue),
        )
      : undefined;

    if (selectedCity) {
      setStatusMessage(null);
      goToCity(selectedCity.slug, selectedCity.name);
      return;
    }

    const resolution = resolveCitySearch(inputValue, cities);

    if (resolution.status !== "match") {
      const message =
        resolution.status === "empty"
          ? "Scrivi il nome di una città."
          : resolution.status === "ambiguous"
            ? "Scegli una città dai risultati."
            : "Questa città non è ancora disponibile.";
      setStatusMessage(message);
      searchInputRef.current?.focus();
      setSuggestionsOpen(resolution.status === "ambiguous" && suggestions.items.length > 0);
      return;
    }

    setStatusMessage(null);
    const resolvedCity = cities.find((city) => city.slug === resolution.slug);
    goToCity(resolution.slug, resolvedCity?.name ?? inputValue.trim());
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setInputValue(nextValue);
    setSelectedSlug(null);
    setStatusMessage(null);
    setActiveSuggestionIndex(-1);
    setSuggestionsOpen(
      !isComposingRef.current &&
        normalizeCitySearchText(nextValue).length >= minimumPublicSearchSuggestionQueryLength,
    );
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || isComposingRef.current || event.keyCode === 229) {
      if (event.key === "Enter" || event.keyCode === 229) suppressImmediateSubmit();
      return;
    }

    if (event.key === "Enter" && event.repeat) {
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowDown" && suggestions.items.length > 0) {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestionIndex((current) =>
        current < 0 ? 0 : Math.min(current + 1, suggestions.items.length - 1),
      );
      return;
    }

    if (event.key === "ArrowUp" && suggestions.items.length > 0) {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestionIndex((current) =>
        current < 0 ? suggestions.items.length - 1 : Math.max(current - 1, 0),
      );
      return;
    }

    if (event.key === "Enter" && listboxVisible && activeSuggestion) {
      event.preventDefault();
      selectSuggestion(activeSuggestion);
      return;
    }

    if (event.key === "Escape" && suggestionsVisible) {
      event.preventDefault();
      closeSuggestions();
      return;
    }

    if (event.key === "Tab") closeSuggestions();
  };

  const handleInputBlur = () => {
    cancelPendingBlur();
    blurFrameRef.current = requestAnimationFrame(() => {
      blurFrameRef.current = null;
      if (!pointerSelectingRef.current) closeSuggestions();
    });
  };

  return (
    <div className={styles.entryFormWrap}>
      <form className={styles.entryForm} onSubmit={handleSubmit} aria-busy={isPending} noValidate>
        <label className={styles.srOnly} htmlFor="citycore-city-search">
          Cerca una città
        </label>
        <div
          className={`${styles.searchComposer}${suggestionsVisible ? ` ${styles.searchComposerOpen}` : ""}${statusMessage ? ` ${styles.searchComposerInvalid}` : ""}`}
        >
          <div className={styles.searchShell}>
            <span className={styles.searchIcon} aria-hidden="true" />
            <input
              aria-activedescendant={activeSuggestionId}
              aria-autocomplete="list"
              aria-controls={listboxVisible ? listboxId : undefined}
              aria-describedby={statusMessage ? "citycore-city-search-error" : undefined}
              aria-expanded={listboxVisible}
              aria-invalid={Boolean(statusMessage)}
              autoCapitalize="words"
              autoComplete="off"
              className={styles.searchInput}
              disabled={isPending || !hasCities}
              enterKeyHint="go"
              id="citycore-city-search"
              onBlur={handleInputBlur}
              onChange={handleInputChange}
              onCompositionEnd={(event) => {
                isComposingRef.current = false;
                const nextValue = event.currentTarget.value;
                setInputValue(nextValue);
                setSuggestionsOpen(
                  normalizeCitySearchText(nextValue).length >=
                    minimumPublicSearchSuggestionQueryLength,
                );
              }}
              onCompositionStart={() => {
                isComposingRef.current = true;
                closeSuggestions();
              }}
              onFocus={() => {
                cancelPendingBlur();
                if (
                  !isPending &&
                  !isComposingRef.current &&
                  normalizeCitySearchText(inputValue).length >=
                    minimumPublicSearchSuggestionQueryLength
                ) {
                  setSuggestionsOpen(true);
                }
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Cerca una città"
              ref={searchInputRef}
              required
              role="combobox"
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

          {suggestionsVisible ? (
            <div className={styles.suggestionsPanel}>
              {suggestions.items.length ? (
                <ul
                  aria-label="Città suggerite"
                  className={styles.suggestionsList}
                  id={listboxId}
                  role="listbox"
                >
                  {suggestions.items.map((city, index) => {
                    const optionId = `${listboxId}-option-${index}`;
                    const isActive = index === activeSuggestionIndex;
                    const qualifier = city.qualifier?.trim() || null;

                    return (
                      <li
                        aria-selected={isActive}
                        className={`${styles.suggestionOption}${isActive ? ` ${styles.suggestionOptionActive}` : ""}`}
                        id={optionId}
                        key={city.slug}
                        onClick={() => selectSuggestion(city)}
                        onPointerDown={() => {
                          pointerSelectingRef.current = true;
                        }}
                        ref={(element) => {
                          optionRefs.current[index] = element;
                        }}
                        role="option"
                      >
                        <span className={styles.suggestionName}>
                          <HighlightedCityName name={city.name} query={inputValue} />
                        </span>
                        {qualifier ? (
                          <span className={styles.suggestionQualifier}>{qualifier}</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className={styles.suggestionsEmpty} role="status">
                  <strong>Nessuna città trovata</strong>
                  <span>Prova con un nome diverso.</span>
                </div>
              )}

              {suggestions.truncated ? (
                <p className={styles.suggestionsFooter}>
                  Continua a scrivere per restringere i risultati
                </p>
              ) : null}
            </div>
          ) : null}
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
