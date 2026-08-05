import { describe, expect, it } from "vitest";
import {
  formatOpeningInterval,
  formatServiceDuration,
  getBusinessOpeningStatus,
  getCurrentWeekdayInTimezone,
  sortPublicBusinessServices,
} from "./business-opening-hours";

const monday = (intervals = [{ opensAt: "09:00", closesAt: "13:00", sortOrder: 0 }]) => [
  { weekday: 0, isClosed: false, note: null, intervals },
];

describe("business opening hours", () => {
  it("sorts services without mutating the input", () => {
    const items = [
      { name: "Zeta", sortOrder: 1 },
      { name: "Alfa", sortOrder: 1 },
      { name: "Beta", sortOrder: 0 },
    ];
    expect(sortPublicBusinessServices(items).map((item) => item.name)).toEqual([
      "Beta",
      "Alfa",
      "Zeta",
    ]);
    expect(items.map((item) => item.name)).toEqual(["Zeta", "Alfa", "Beta"]);
  });
  it.each([
    [null, null],
    [0, null],
    [30, "30 min"],
    [45, "45 min"],
    [60, "1 ora"],
    [90, "1 ora e 30 min"],
    [120, "2 ore"],
    [150, "2 ore e 30 min"],
  ])("formats service duration %s", (minutes, expected) =>
    expect(formatServiceDuration(minutes)).toBe(expected),
  );
  it("returns open status in the first interval", () =>
    expect(
      getBusinessOpeningStatus(monday(), "Europe/Rome", new Date("2026-08-03T08:00:00Z")),
    ).toEqual({ state: "open", label: "Aperto ora", detail: "Chiude alle 13:00" }));
  it("returns the next same-day opening during a break", () =>
    expect(
      getBusinessOpeningStatus(
        monday([
          { opensAt: "09:00", closesAt: "13:00", sortOrder: 0 },
          { opensAt: "15:00", closesAt: "19:00", sortOrder: 1 },
        ]),
        "Europe/Rome",
        new Date("2026-08-03T12:00:00Z"),
      ).detail,
    ).toBe("Riapre alle 15:00"));
  it("returns unknown for unavailable hours or invalid timezone", () => {
    expect(getBusinessOpeningStatus([], "Europe/Rome").state).toBe("unknown");
    expect(getBusinessOpeningStatus(monday(), "Invalid/Zone").state).toBe("unknown");
  });
  it("calculates weekdays in the business timezone", () =>
    expect(getCurrentWeekdayInTimezone(new Date("2026-08-02T22:30:00Z"), "Europe/Rome")).toBe(0));
  it("formats opening intervals", () =>
    expect(formatOpeningInterval("09:00", "13:00")).toBe("09:00–13:00"));
});
