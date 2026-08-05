import { describe, expect, it } from "vitest";

import {
  buildPickupSlots,
  canTransitionPickupOrderStatus,
  getDateInTimeZone,
  isPickupDateAllowed,
  pickupSlotId,
} from "../../src/platform-core/pickup-ordering.js";

const openingDays = [
  { weekday: 0, isClosed: false, intervals: [{ opensAt: "18:00", closesAt: "20:00" }] },
  { weekday: 1, isClosed: true, intervals: [] },
];

describe("pickup ordering", () => {
  it("builds available slots from real opening intervals and honors capacity", () => {
    const now = new Date("2026-08-03T14:00:00.000Z");
    const firstPickupAt = new Date("2026-08-03T16:00:00.000Z");
    const slots = buildPickupSlots({
      date: "2026-08-03",
      timeZone: "Europe/Rome",
      openingDays,
      slotMinutes: 15,
      pickupLeadMinutes: 30,
      slotCapacity: 2,
      reservations: new Map([[firstPickupAt.getTime(), 2]]),
      now,
    });

    expect(slots.map((slot) => slot.time)).toEqual([
      "18:00",
      "18:15",
      "18:30",
      "18:45",
      "19:00",
      "19:15",
      "19:30",
      "19:45",
    ]);
    expect(slots[0]).toMatchObject({ id: "2026-08-03T18:00", available: false });
    expect(slots[1]?.available).toBe(true);
  });

  it("hides past and closed-day slots while keeping date handling timezone aware", () => {
    const now = new Date("2026-08-03T16:35:00.000Z");
    expect(getDateInTimeZone(now, "Europe/Rome")).toBe("2026-08-03");
    expect(
      buildPickupSlots({
        date: "2026-08-03",
        timeZone: "Europe/Rome",
        openingDays,
        slotMinutes: 15,
        pickupLeadMinutes: 30,
        slotCapacity: 2,
        reservations: new Map(),
        now,
      }).map((slot) => slot.time),
    ).toEqual(["19:15", "19:30", "19:45"]);
    expect(
      buildPickupSlots({
        date: "2026-08-04",
        timeZone: "Europe/Rome",
        openingDays,
        slotMinutes: 15,
        pickupLeadMinutes: 30,
        slotCapacity: 2,
        reservations: new Map(),
        now,
      }),
    ).toEqual([]);
  });

  it("keeps a bounded date horizon and valid order transitions", () => {
    const now = new Date("2026-08-03T14:00:00.000Z");
    expect(isPickupDateAllowed("2026-08-03", "Europe/Rome", now)).toBe(true);
    expect(isPickupDateAllowed("2026-09-03", "Europe/Rome", now)).toBe(false);
    expect(pickupSlotId("2026-08-03", "18:00")).toBe("2026-08-03T18:00");
    expect(canTransitionPickupOrderStatus("new", "accepted")).toBe(true);
    expect(canTransitionPickupOrderStatus("ready", "completed")).toBe(true);
    expect(canTransitionPickupOrderStatus("completed", "ready")).toBe(false);
  });
});
