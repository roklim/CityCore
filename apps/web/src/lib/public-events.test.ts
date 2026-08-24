import { describe, expect, it } from "vitest";

import type { PublicCityEvent } from "./platform-api";
import { formatPublicEventSchedule, mapPublicCityEvent } from "./public-events";

const baseEvent: PublicCityEvent = {
  id: "event-1",
  title: "Mercato locale",
  slug: "mercato-locale",
  summary: "Evento demo",
  description: null,
  status: "published",
  venueName: "Piazza",
  addressLine1: null,
  startsAt: "2030-06-01T07:00:00.000Z",
  endsAt: "2030-06-01T10:00:00.000Z",
  timezone: "Europe/Rome",
  organizer: { name: "Agenda Cagli", businessSlug: "agenda-cagli" },
};

describe("public city events", () => {
  it("formats a same-day interval in the event timezone", () => {
    const label = formatPublicEventSchedule(baseEvent);

    expect(label).toContain("1 giugno 2030");
    expect(label).toContain("09:00");
    expect(label).toContain("12:00");
  });

  it("formats a single instant and a range crossing the local day", () => {
    expect(formatPublicEventSchedule({ ...baseEvent, endsAt: null })).not.toContain("–");

    const overnight = formatPublicEventSchedule({
      ...baseEvent,
      startsAt: "2030-06-01T21:30:00.000Z",
      endsAt: "2030-06-02T01:00:00.000Z",
    });
    expect(overnight).toContain("1 giugno 2030");
    expect(overnight).toContain("2 giugno 2030");
  });

  it("falls back to the Italian timezone when persisted timezone data is invalid", () => {
    expect(formatPublicEventSchedule({ ...baseEvent, timezone: "Invalid/Timezone" })).toContain(
      "09:00",
    );
  });

  it("never throws and reports an unavailable date when startsAt is malformed", () => {
    expect(() => formatPublicEventSchedule({ ...baseEvent, startsAt: "not-a-date" })).not.toThrow();
    expect(formatPublicEventSchedule({ ...baseEvent, startsAt: "not-a-date" })).toBe(
      "Data non disponibile",
    );
  });

  it("ignores a malformed endsAt and still renders the start instant", () => {
    expect(() => formatPublicEventSchedule({ ...baseEvent, endsAt: "not-a-date" })).not.toThrow();
    expect(formatPublicEventSchedule({ ...baseEvent, endsAt: "not-a-date" })).not.toContain("–");
  });

  it("combines an invalid timezone and a malformed startsAt without throwing", () => {
    expect(() =>
      formatPublicEventSchedule({
        ...baseEvent,
        timezone: "Invalid/Timezone",
        startsAt: "not-a-date",
      }),
    ).not.toThrow();
  });

  it("links only organizers backed by a public business slug", () => {
    expect(mapPublicCityEvent(baseEvent, "cagli").organizerHref).toBe("/cagli/agenda-cagli");
    expect(
      mapPublicCityEvent(
        { ...baseEvent, organizer: { name: "Comune di Cagli", businessSlug: null } },
        "cagli",
      ).organizerHref,
    ).toBeNull();
  });
});
