import { buildBusinessPath } from "@platform/domain";

import type { PublicCityEvent } from "./platform-api";

export type PublicCityEventCard = PublicCityEvent & {
  organizerHref: string | null;
};

export function mapPublicCityEvent(event: PublicCityEvent, citySlug: string): PublicCityEventCard {
  return {
    ...event,
    organizerHref: event.organizer.businessSlug
      ? buildBusinessPath({ citySlug, businessSlug: event.organizer.businessSlug })
      : null,
  };
}

const FALLBACK_TIMEZONE = "Europe/Rome";

// Resolved independently of any event date: an invalid IANA identifier throws at
// formatter construction time, regardless of whether startsAt/endsAt parse.
function resolvePublicEventTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("it-IT", { timeZone: timezone });
    return timezone;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

export function formatPublicEventSchedule(
  event: Pick<PublicCityEvent, "startsAt" | "endsAt" | "timezone">,
) {
  const startsAt = new Date(event.startsAt);
  const endsAt = event.endsAt ? new Date(event.endsAt) : null;
  const timeZone = resolvePublicEventTimeZone(event.timezone);

  // A malformed persisted date still parses to a `Date`, just an invalid one, and
  // formatting it throws a RangeError unrelated to the timezone above: guard it
  // separately so a bad startsAt/endsAt never crashes SSR.
  if (Number.isNaN(startsAt.getTime())) {
    return "Data non disponibile";
  }

  const dateFormatter = new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  });
  const timeFormatter = new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
  const startDate = dateFormatter.format(startsAt);
  const startTime = timeFormatter.format(startsAt);

  if (!endsAt || Number.isNaN(endsAt.getTime())) return `${startDate} · ${startTime}`;

  const endDate = dateFormatter.format(endsAt);
  const endTime = timeFormatter.format(endsAt);
  return startDate === endDate
    ? `${startDate} · ${startTime}–${endTime}`
    : `${startDate} · ${startTime} – ${endDate} · ${endTime}`;
}
