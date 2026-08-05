import type { PublicOpeningDay } from "./platform-api";

export type BusinessOpeningStatus = {
  state: "open" | "closed" | "unknown";
  label: string;
  detail: string | null;
};

const weekdays = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

function zonedParts(date: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const value = (type: string) => parts.find((part) => part.type === type)?.value;
    const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(
      value("weekday") ?? "",
    );
    const hour = Number(value("hour"));
    const minute = Number(value("minute"));
    return weekday >= 0 && Number.isFinite(hour) && Number.isFinite(minute)
      ? { weekday, minutes: hour * 60 + minute }
      : null;
  } catch {
    return null;
  }
}

export function getCurrentWeekdayInTimezone(date: Date, timezone: string) {
  return zonedParts(date, timezone)?.weekday ?? null;
}

export function getCurrentMinutesInTimezone(date: Date, timezone: string) {
  return zonedParts(date, timezone)?.minutes ?? null;
}

export function formatOpeningInterval(opensAt: string, closesAt: string) {
  return `${opensAt}–${closesAt}`;
}
export function formatOpeningDay(day: PublicOpeningDay) {
  return day.isClosed
    ? "Chiuso"
    : day.intervals.map((item) => formatOpeningInterval(item.opensAt, item.closesAt)).join(" · ");
}
export function formatServiceDuration(minutes: number | null) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours} ${hours === 1 ? "ora" : "ore"}${remainder ? ` e ${remainder} min` : ""}`;
}
export function sortPublicBusinessServices<T extends { sortOrder: number; name: string }>(
  items: T[],
) {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "it"));
}
export function getBusinessOpeningStatus(
  days: PublicOpeningDay[],
  timezone: string,
  now = new Date(),
): BusinessOpeningStatus {
  const current = zonedParts(now, timezone);
  if (!current || !days.length)
    return { state: "unknown", label: "Orari non disponibili", detail: null };
  const day = days.find((entry) => entry.weekday === current.weekday);
  if (!day || day.isClosed) return { state: "closed", label: "Chiuso", detail: null };
  for (const interval of day.intervals) {
    const [oh, om] = interval.opensAt.split(":").map(Number);
    const [ch, cm] = interval.closesAt.split(":").map(Number);
    const opens = oh * 60 + om;
    const closes = ch * 60 + cm;
    if (current.minutes >= opens && current.minutes < closes)
      return { state: "open", label: "Aperto ora", detail: `Chiude alle ${interval.closesAt}` };
    if (current.minutes < opens)
      return { state: "closed", label: "Chiuso", detail: `Riapre alle ${interval.opensAt}` };
  }
  return { state: "closed", label: "Chiuso", detail: null };
}
export { weekdays };
