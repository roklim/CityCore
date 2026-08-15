import { describe, expect, it } from "vitest";
import {
  formatOpeningInterval,
  formatOpeningDayWithNote,
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
  it("returns tomorrow's opening after the last closing interval", () =>
    expect(
      getBusinessOpeningStatus(
        [
          {
            weekday: 0,
            isClosed: false,
            note: null,
            intervals: [{ opensAt: "09:00", closesAt: "13:00", sortOrder: 0 }],
          },
          {
            weekday: 1,
            isClosed: false,
            note: null,
            intervals: [{ opensAt: "09:00", closesAt: "18:00", sortOrder: 0 }],
          },
        ],
        "Europe/Rome",
        new Date("2026-08-03T18:00:00Z"),
      ),
    ).toEqual({ state: "closed", label: "Chiuso", detail: "Apre domani alle 09:00" }));
  it("skips a closed tomorrow and returns the following opening", () =>
    expect(
      getBusinessOpeningStatus(
        [
          ...monday(),
          { weekday: 1, isClosed: true, note: null, intervals: [] },
          {
            weekday: 2,
            isClosed: false,
            note: null,
            intervals: [{ opensAt: "09:00", closesAt: "18:00", sortOrder: 0 }],
          },
        ],
        "Europe/Rome",
        new Date("2026-08-03T18:00:00Z"),
      ).detail,
    ).toBe("Apre mercoledì alle 09:00"));
  it("skips multiple consecutive closed days in an unordered schedule", () =>
    expect(
      getBusinessOpeningStatus(
        [
          {
            weekday: 4,
            isClosed: false,
            note: null,
            intervals: [{ opensAt: "10:00", closesAt: "18:00", sortOrder: 0 }],
          },
          { weekday: 2, isClosed: true, note: null, intervals: [] },
          ...monday(),
          { weekday: 3, isClosed: true, note: null, intervals: [] },
          { weekday: 1, isClosed: true, note: null, intervals: [] },
        ],
        "Europe/Rome",
        new Date("2026-08-03T18:00:00Z"),
      ).detail,
    ).toBe("Apre venerdì alle 10:00"));
  it("returns closed without a detail when the entire week is closed", () =>
    expect(
      getBusinessOpeningStatus(
        Array.from({ length: 7 }, (_, weekday) => ({
          weekday,
          isClosed: true,
          note: null,
          intervals: [],
        })),
        "Europe/Rome",
        new Date("2026-08-03T18:00:00Z"),
      ),
    ).toEqual({ state: "closed", label: "Chiuso", detail: null }));
  it("returns unknown for unavailable hours", () => {
    expect(getBusinessOpeningStatus([], "Europe/Rome").state).toBe("unknown");
  });
  it("returns unknown for an invalid timezone", () => {
    expect(getBusinessOpeningStatus(monday(), "Invalid/Zone").state).toBe("unknown");
  });
  it("calculates weekdays in the business timezone", () =>
    expect(getCurrentWeekdayInTimezone(new Date("2026-08-02T22:30:00Z"), "Europe/Rome")).toBe(0));
  it("formats opening intervals", () =>
    expect(formatOpeningInterval("09:00", "13:00")).toBe("09:00–13:00"));
  it("keeps a persisted opening-hours note next to the real interval", () => {
    expect(
      formatOpeningDayWithNote({
        weekday: 0,
        isClosed: false,
        note: "Solo su appuntamento",
        intervals: [{ opensAt: "09:00", closesAt: "13:00", sortOrder: 0 }],
      }),
    ).toBe("09:00–13:00 · Solo su appuntamento");
  });
  it("changes from closed to open and back at the configured boundaries", () => {
    const hours = monday();
    expect(
      getBusinessOpeningStatus(hours, "Europe/Rome", new Date("2026-08-03T06:59:00Z")).state,
    ).toBe("closed");
    expect(
      getBusinessOpeningStatus(hours, "Europe/Rome", new Date("2026-08-03T07:00:00Z")).state,
    ).toBe("open");
    expect(
      getBusinessOpeningStatus(hours, "Europe/Rome", new Date("2026-08-03T11:00:00Z")).state,
    ).toBe("closed");
  });
  it("uses the business timezone instead of the runtime timezone", () => {
    expect(
      getBusinessOpeningStatus(monday(), "America/New_York", new Date("2026-08-03T13:30:00Z"))
        .state,
    ).toBe("open");
  });
  it("uses Intl timezone rules across a New York DST transition", () => {
    const sunday = [
      {
        weekday: 6,
        isClosed: false,
        note: null,
        intervals: [{ opensAt: "03:00", closesAt: "04:00", sortOrder: 0 }],
      },
    ];
    expect(
      getBusinessOpeningStatus(sunday, "America/New_York", new Date("2026-03-08T07:30:00Z")).state,
    ).toBe("open");
  });
});
