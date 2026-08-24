import { describe, expect, it } from "vitest";

import { publicListEventsQuerySchema } from "../../src/platform-core/config.js";
import { mapPublicEvent } from "../../src/platform-core/mappers.js";

const event = {
  id: "event-1",
  cityId: "city-1",
  title: "Mercato locale",
  slug: "mercato-locale",
  summary: "Evento dimostrativo",
  description: null,
  organizerName: "Agenda Cagli",
  venueName: "Piazza",
  addressLine1: null,
  startsAt: new Date("2030-06-01T07:00:00.000Z"),
  endsAt: new Date("2030-06-01T10:00:00.000Z"),
  timezone: "Europe/Rome",
  status: "published" as const,
  organizerBusiness: {
    cityId: "city-1",
    name: "Agenda Cagli",
    slug: "agenda-cagli",
    status: "active" as const,
  },
};

describe("public city events", () => {
  it("rejects an inverted date range", () => {
    expect(
      publicListEventsQuerySchema.safeParse({ from: "2030-06-02", to: "2030-06-01" }).success,
    ).toBe(false);
    expect(
      publicListEventsQuerySchema.safeParse({ from: "2030-06-01", to: "2030-06-02" }).success,
    ).toBe(true);
  });

  it("maps ISO dates, publication status and the organizer snapshot", () => {
    expect(mapPublicEvent(event)).toEqual(
      expect.objectContaining({
        status: "published",
        startsAt: "2030-06-01T07:00:00.000Z",
        endsAt: "2030-06-01T10:00:00.000Z",
        organizer: { name: "Agenda Cagli", businessSlug: "agenda-cagli" },
      }),
    );
  });

  it("suppresses the organizer link for an inactive or cross-city business", () => {
    expect(
      mapPublicEvent({
        ...event,
        organizerBusiness: { ...event.organizerBusiness, status: "paused" },
      }).organizer.businessSlug,
    ).toBeNull();
    expect(
      mapPublicEvent({
        ...event,
        organizerBusiness: { ...event.organizerBusiness, cityId: "city-2" },
      }).organizer.businessSlug,
    ).toBeNull();
  });
});
