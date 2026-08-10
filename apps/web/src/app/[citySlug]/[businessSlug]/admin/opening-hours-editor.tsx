"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";
import type { PlatformOpeningDay } from "../../../../lib/platform-api";
import {
  buildOpeningWeekPayload,
  validateOpeningWeek,
  type OpeningDayDraft,
} from "../../../../lib/business-admin-logic";
import { updateOpeningHoursAction, type BusinessMutationState } from "./actions";

const weekdayLabels = [
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
  "Domenica",
];
const initialState: BusinessMutationState = { error: null, notice: null };

function initialDays(items: PlatformOpeningDay[]): OpeningDayDraft[] {
  return Array.from({ length: 7 }, (_, weekday) => {
    const day = items.find((candidate) => candidate.weekday === weekday);
    return day
      ? {
          weekday,
          isClosed: day.isClosed,
          note: day.note,
          intervals: day.intervals.map(({ opensAt, closesAt }) => ({ opensAt, closesAt })),
        }
      : { weekday, isClosed: true, note: null, intervals: [] };
  });
}

export function OpeningHoursEditor({
  citySlug,
  businessSlug,
  items,
}: {
  citySlug: string;
  businessSlug: string;
  items: PlatformOpeningDay[];
}) {
  const [days, setDays] = useState(() => initialDays(items));
  const [state, setState] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  function updateDay(weekday: number, update: (day: OpeningDayDraft) => OpeningDayDraft) {
    setDays((current) => current.map((day) => (day.weekday === weekday ? update(day) : day)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const formData = new FormData(event.currentTarget);
    const payload = buildOpeningWeekPayload(formData);
    const errors = validateOpeningWeek(payload.days);
    if (errors.length) {
      setState({ error: errors[0], notice: null });
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    const result = await updateOpeningHoursAction(initialState, formData);
    setState(result);
    if (result.notice) {
      const url = new URL(window.location.href);
      url.searchParams.set("notice", result.notice);
      url.hash = "opening-hours";
      window.location.assign(url);
      return;
    }
    submittingRef.current = false;
    setIsSubmitting(false);
  }

  return (
    <form aria-busy={isSubmitting} className="business-management-form" onSubmit={handleSubmit}>
      <input type="hidden" name="citySlug" value={citySlug} />
      <input type="hidden" name="businessSlug" value={businessSlug} />
      <fieldset className="business-form-fieldset" disabled={isSubmitting}>
        <legend>Settimana di apertura</legend>
        <div className="opening-week-grid">
          {days.map((day) => (
            <fieldset className="opening-day-card" key={day.weekday}>
              <legend>{weekdayLabels[day.weekday]}</legend>
              <label className="business-check-option">
                <input
                  checked={day.isClosed}
                  name={`day-${day.weekday}-closed`}
                  onChange={(event) =>
                    updateDay(day.weekday, (current) => ({
                      ...current,
                      isClosed: event.target.checked,
                      intervals: event.target.checked
                        ? []
                        : current.intervals.length
                          ? current.intervals
                          : [{ opensAt: "09:00", closesAt: "13:00" }],
                    }))
                  }
                  type="checkbox"
                />
                Chiuso
              </label>
              <input type="hidden" name={`day-${day.weekday}-count`} value={day.intervals.length} />
              {!day.isClosed ? (
                <div className="opening-interval-list">
                  {day.intervals.map((interval, index) => (
                    <div className="opening-interval-row" key={`${day.weekday}-${index}`}>
                      <label className="field">
                        <span>Apre</span>
                        <input
                          aria-label={`${weekdayLabels[day.weekday]}, fascia ${index + 1}, apertura`}
                          name={`day-${day.weekday}-opens-${index}`}
                          onChange={(event) =>
                            updateDay(day.weekday, (current) => ({
                              ...current,
                              intervals: current.intervals.map((candidate, candidateIndex) =>
                                candidateIndex === index
                                  ? { ...candidate, opensAt: event.target.value }
                                  : candidate,
                              ),
                            }))
                          }
                          required
                          type="time"
                          value={interval.opensAt}
                        />
                      </label>
                      <span aria-hidden="true">→</span>
                      <label className="field">
                        <span>Chiude</span>
                        <input
                          aria-label={`${weekdayLabels[day.weekday]}, fascia ${index + 1}, chiusura`}
                          name={`day-${day.weekday}-closes-${index}`}
                          onChange={(event) =>
                            updateDay(day.weekday, (current) => ({
                              ...current,
                              intervals: current.intervals.map((candidate, candidateIndex) =>
                                candidateIndex === index
                                  ? { ...candidate, closesAt: event.target.value }
                                  : candidate,
                              ),
                            }))
                          }
                          required
                          type="time"
                          value={interval.closesAt}
                        />
                      </label>
                      <button
                        aria-label={`Rimuovi fascia ${index + 1} di ${weekdayLabels[day.weekday]}`}
                        className="ghost-button"
                        onClick={() =>
                          updateDay(day.weekday, (current) => ({
                            ...current,
                            intervals: current.intervals.filter(
                              (_, candidateIndex) => candidateIndex !== index,
                            ),
                          }))
                        }
                        type="button"
                      >
                        Rimuovi
                      </button>
                    </div>
                  ))}
                  {day.intervals.length < 4 ? (
                    <button
                      className="ghost-button opening-add-button"
                      onClick={() =>
                        updateDay(day.weekday, (current) => ({
                          ...current,
                          intervals: [
                            ...current.intervals,
                            { opensAt: "15:00", closesAt: "19:00" },
                          ],
                        }))
                      }
                      type="button"
                    >
                      + Aggiungi fascia
                    </button>
                  ) : null}
                </div>
              ) : null}
              <label className="field">
                <span>Nota (facoltativa)</span>
                <input
                  maxLength={280}
                  name={`day-${day.weekday}-note`}
                  onChange={(event) =>
                    updateDay(day.weekday, (current) => ({
                      ...current,
                      note: event.target.value || null,
                    }))
                  }
                  value={day.note ?? ""}
                />
              </label>
            </fieldset>
          ))}
        </div>
      </fieldset>
      {state.error ? (
        <p className="surface-error" role="alert">
          {state.error} Gli orari inseriti sono stati conservati.
        </p>
      ) : null}
      <button className="form-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Salvataggio…" : "Salva settimana"}
      </button>
    </form>
  );
}
