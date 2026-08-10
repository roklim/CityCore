import type { PlatformPublishReadiness } from "./platform-api";

export const socialFields = ["instagram", "facebook", "linkedin", "tiktok", "youtube"] as const;
export type SocialField = (typeof socialFields)[number];

export type OpeningIntervalDraft = { opensAt: string; closesAt: string };
export type OpeningDayDraft = {
  weekday: number;
  isClosed: boolean;
  note: string | null;
  intervals: OpeningIntervalDraft[];
};

export type OpeningWeekPayload = { days: OpeningDayDraft[] };

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function buildSocialLinksFromForm(formData: FormData) {
  const entries = socialFields.flatMap((field) => {
    const value = text(formData, field);
    return value ? ([[field, value]] as const) : [];
  });
  return entries.length ? Object.fromEntries(entries) : null;
}

export function buildOpeningWeekPayload(formData: FormData): OpeningWeekPayload {
  return {
    days: Array.from({ length: 7 }, (_, weekday) => {
      const isClosed = formData.get(`day-${weekday}-closed`) === "on";
      const count = Number(text(formData, `day-${weekday}-count`));
      const intervalCount = Number.isInteger(count) && count >= 0 && count <= 4 ? count : 0;
      return {
        weekday,
        isClosed,
        note: text(formData, `day-${weekday}-note`) || null,
        intervals: Array.from({ length: intervalCount }, (_, index) => ({
          opensAt: text(formData, `day-${weekday}-opens-${index}`),
          closesAt: text(formData, `day-${weekday}-closes-${index}`),
        })),
      };
    }),
  };
}

function timeToMinutes(value: string) {
  if (!/^\d{2}:\d{2}$/u.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour <= 23 && minute <= 59 ? hour * 60 + minute : null;
}

export function validateOpeningWeek(days: readonly OpeningDayDraft[]) {
  const errors: string[] = [];
  for (const day of days) {
    if (day.isClosed && day.intervals.length) {
      errors.push(`Il giorno ${day.weekday + 1} è chiuso ma contiene fasce orarie.`);
      continue;
    }
    if (day.isClosed) continue;

    if (!day.intervals.length) {
      errors.push(`Aggiungi almeno una fascia al giorno ${day.weekday + 1}.`);
      continue;
    }

    const ranges = day.intervals.map((interval, index) => {
      const opens = timeToMinutes(interval.opensAt);
      const closes = timeToMinutes(interval.closesAt);
      if (opens === null || closes === null) {
        errors.push(`Completa apertura e chiusura della fascia ${index + 1}.`);
        return null;
      }
      if (opens >= closes) {
        errors.push(`L'apertura deve precedere la chiusura nella fascia ${index + 1}.`);
      }
      return { opens, closes };
    });
    const validRanges = ranges
      .filter((range): range is { opens: number; closes: number } => Boolean(range))
      .sort((left, right) => left.opens - right.opens);
    for (let index = 1; index < validRanges.length; index += 1) {
      if (validRanges[index].opens < validRanges[index - 1].closes) {
        errors.push(`Le fasce del giorno ${day.weekday + 1} si sovrappongono.`);
        break;
      }
    }
  }
  return [...new Set(errors)];
}

const readinessLabels: Record<string, string> = {
  name: "Nome dell'attività mancante",
  slug: "Slug dell'attività mancante",
  active_city: "La città non è attiva",
  description: "Descrizione pubblica mancante",
  active_category: "Categoria attiva mancante",
  public_contact: "Contatto pubblico mancante",
};

export function readinessReasonLabel(reason: string) {
  return readinessLabels[reason] ?? "Requisito di pubblicazione non soddisfatto";
}

export function readinessSummary(readiness: PlatformPublishReadiness) {
  return readiness.canPublish ? "Pronto per la pubblicazione" : "Non ancora pronto";
}
