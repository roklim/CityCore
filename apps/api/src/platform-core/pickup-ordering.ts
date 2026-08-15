export const pickupOrderStatuses = [
  "new",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;

export type PickupOrderStatus = (typeof pickupOrderStatuses)[number];

type PickupOpeningDay = {
  weekday: number;
  isClosed: boolean;
  intervals: Array<{ opensAt: string; closesAt: string }>;
};

type PickupSlot = {
  id: string;
  date: string;
  time: string;
  pickupAt: Date;
  available: boolean;
};

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

function dateParts(value: string) {
  if (!isoDatePattern.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  )
    return null;
  return { year, month, day };
}

function timeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/u.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function zonedParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((entry) => entry.type === type)?.value ?? "0");
  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
    second: part("second"),
  };
}

function timeZoneOffset(value: Date, timeZone: string) {
  const parts = zonedParts(value, timeZone);
  return (
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) -
    value.getTime()
  );
}

export function zonedDateTimeToUtc(date: string, time: string, timeZone: string) {
  const parsedDate = dateParts(date);
  const minutes = timeToMinutes(time);
  if (!parsedDate || minutes === null) return null;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const assumedUtc = new Date(
    Date.UTC(parsedDate.year, parsedDate.month - 1, parsedDate.day, hour, minute),
  );
  const firstOffset = timeZoneOffset(assumedUtc, timeZone);
  let result = new Date(assumedUtc.getTime() - firstOffset);
  const secondOffset = timeZoneOffset(result, timeZone);
  if (secondOffset !== firstOffset) result = new Date(assumedUtc.getTime() - secondOffset);
  return result;
}

export function getDateInTimeZone(value: Date, timeZone: string) {
  const parts = zonedParts(value, timeZone);
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function weekdayForDate(date: string) {
  const parsedDate = dateParts(date);
  if (!parsedDate) return null;
  const weekday = new Date(
    Date.UTC(parsedDate.year, parsedDate.month - 1, parsedDate.day),
  ).getUTCDay();
  return weekday === 0 ? 6 : weekday - 1;
}

export function isPickupDateAllowed(
  date: string,
  timeZone: string,
  now = new Date(),
  maxDaysAhead = 30,
) {
  const requested = dateParts(date);
  const today = dateParts(getDateInTimeZone(now, timeZone));
  if (!requested || !today) return false;
  const requestedDay = Date.UTC(requested.year, requested.month - 1, requested.day) / 86_400_000;
  const currentDay = Date.UTC(today.year, today.month - 1, today.day) / 86_400_000;
  return requestedDay >= currentDay && requestedDay <= currentDay + maxDaysAhead;
}

export function pickupSlotId(date: string, time: string) {
  return `${date}T${time}`;
}

export function canTransitionPickupOrderStatus(
  current: PickupOrderStatus,
  next: PickupOrderStatus,
) {
  if (current === next) return true;
  const nextStatuses: Record<PickupOrderStatus, PickupOrderStatus[]> = {
    new: ["accepted", "cancelled"],
    accepted: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };
  return nextStatuses[current].includes(next);
}

export function buildPickupSlots({
  date,
  timeZone,
  openingDays,
  slotMinutes,
  pickupLeadMinutes,
  slotCapacity,
  reservations,
  now = new Date(),
}: {
  date: string;
  timeZone: string;
  openingDays: PickupOpeningDay[];
  slotMinutes: number;
  pickupLeadMinutes: number;
  slotCapacity: number;
  reservations: ReadonlyMap<number, number>;
  now?: Date;
}) {
  if (!isPickupDateAllowed(date, timeZone, now) || slotMinutes < 5 || slotCapacity < 1) return [];
  const weekday = weekdayForDate(date);
  const openingDay = openingDays.find((day) => day.weekday === weekday);
  if (!openingDay || openingDay.isClosed) return [];
  const earliestPickupAt = now.getTime() + pickupLeadMinutes * 60_000;
  const slots: PickupSlot[] = [];
  const knownSlots = new Set<string>();

  for (const interval of openingDay.intervals) {
    const start = timeToMinutes(interval.opensAt);
    const end = timeToMinutes(interval.closesAt);
    if (start === null || end === null || end <= start) continue;
    for (let minutes = start; minutes < end; minutes += slotMinutes) {
      const time = formatTime(minutes);
      const pickupAt = zonedDateTimeToUtc(date, time, timeZone);
      const id = pickupSlotId(date, time);
      if (!pickupAt || pickupAt.getTime() < earliestPickupAt || knownSlots.has(id)) continue;
      knownSlots.add(id);
      slots.push({
        id,
        date,
        time,
        pickupAt,
        available: (reservations.get(pickupAt.getTime()) ?? 0) < slotCapacity,
      });
    }
  }

  return slots;
}
