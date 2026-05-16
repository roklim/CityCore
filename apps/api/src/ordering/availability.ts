import { Prisma } from "@prisma/client";
import { prisma } from "../database.js";
import {
  type CreateOrderPayload,
  DATE_RE,
  DEFAULT_CLOSED_WEEKDAYS,
  DEFAULT_MAX_ORDERS_PER_SLOT,
  DEFAULT_MIN_PREPARATION_MINUTES,
  DEFAULT_PICKUP_END_TIME,
  DEFAULT_PICKUP_START_TIME,
  DEFAULT_SLOT_MINUTES,
  PICKUP_TIME_ZONE,
  TIME_RE,
} from "./config.js";
import type { OrderingBusiness } from "./business.js";

const WEEKDAY_CODE_BY_INDEX = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"] as const;

function isJsonObject(value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readDateStringArray(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && DATE_RE.test(entry));
}

function readSpecialDates(
  value: Prisma.JsonValue | null | undefined,
): OrderingSettings["specialDates"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is Prisma.JsonObject => isJsonObject(entry))
    .map((entry) => ({
      date: typeof entry.date === "string" && DATE_RE.test(entry.date) ? entry.date : "",
      closed: entry.closed === true,
      openingTimeStart:
        typeof entry.openingTimeStart === "string" && TIME_RE.test(entry.openingTimeStart)
          ? entry.openingTimeStart
          : null,
      openingTimeEnd:
        typeof entry.openingTimeEnd === "string" && TIME_RE.test(entry.openingTimeEnd)
          ? entry.openingTimeEnd
          : null,
      slotMinutes:
        typeof entry.slotMinutes === "number" &&
        Number.isFinite(entry.slotMinutes) &&
        entry.slotMinutes >= 5
          ? Math.trunc(entry.slotMinutes)
          : null,
      maxOrdersPerSlot:
        typeof entry.maxOrdersPerSlot === "number" &&
        Number.isFinite(entry.maxOrdersPerSlot) &&
        entry.maxOrdersPerSlot >= 1
          ? Math.trunc(entry.maxOrdersPerSlot)
          : null,
      minPreparationMinutes:
        typeof entry.minPreparationMinutes === "number" &&
        Number.isFinite(entry.minPreparationMinutes) &&
        entry.minPreparationMinutes >= 0
          ? Math.trunc(entry.minPreparationMinutes)
          : null,
    }))
    .filter((entry) => entry.date.length > 0);
}

export type OrderingSettings = {
  openingHours: string | null;
  openingDays: string[];
  openingTimeStart: string | null;
  openingTimeEnd: string | null;
  deliveryCost: number;
  minimumOrder: number;
  slotMinutes: number;
  maxOrdersPerSlot: number;
  minPreparationMinutes: number;
  closedDates: string[];
  specialDates: Array<{
    date: string;
    closed: boolean;
    openingTimeStart: string | null;
    openingTimeEnd: string | null;
    slotMinutes: number | null;
    maxOrdersPerSlot: number | null;
    minPreparationMinutes: number | null;
  }>;
  serviceZones: string[];
  customerMessage: string | null;
};

export function getOrderingSettings(business: OrderingBusiness | null) {
  const orderingModule = business?.modules.find((entry) => entry.moduleCode === "ordering");
  const settings = orderingModule?.settingsJson;

  if (!isJsonObject(settings)) {
    return {
      openingHours: null,
      openingDays: [],
      openingTimeStart: null,
      openingTimeEnd: null,
      deliveryCost: 0,
      minimumOrder: 0,
      slotMinutes: DEFAULT_SLOT_MINUTES,
      maxOrdersPerSlot: DEFAULT_MAX_ORDERS_PER_SLOT,
      minPreparationMinutes: DEFAULT_MIN_PREPARATION_MINUTES,
      closedDates: [],
      specialDates: [],
      serviceZones: [],
      customerMessage: null,
    } satisfies OrderingSettings;
  }

  return {
    openingHours:
      typeof settings.openingHours === "string" && settings.openingHours.trim().length > 0
        ? settings.openingHours.trim()
        : null,
    openingDays:
      Array.isArray(settings.openingDays) &&
      settings.openingDays.every((day) => typeof day === "string")
        ? settings.openingDays
        : [],
    openingTimeStart:
      typeof settings.openingTimeStart === "string" ? settings.openingTimeStart : null,
    openingTimeEnd: typeof settings.openingTimeEnd === "string" ? settings.openingTimeEnd : null,
    deliveryCost:
      typeof settings.deliveryCost === "number" && Number.isFinite(settings.deliveryCost)
        ? settings.deliveryCost
        : 0,
    minimumOrder:
      typeof settings.minimumOrder === "number" && Number.isFinite(settings.minimumOrder)
        ? settings.minimumOrder
        : 0,
    slotMinutes:
      typeof settings.slotMinutes === "number" &&
      Number.isFinite(settings.slotMinutes) &&
      settings.slotMinutes >= 5
        ? Math.trunc(settings.slotMinutes)
        : DEFAULT_SLOT_MINUTES,
    maxOrdersPerSlot:
      typeof settings.maxOrdersPerSlot === "number" &&
      Number.isFinite(settings.maxOrdersPerSlot) &&
      settings.maxOrdersPerSlot >= 1
        ? Math.trunc(settings.maxOrdersPerSlot)
        : DEFAULT_MAX_ORDERS_PER_SLOT,
    minPreparationMinutes:
      typeof settings.minPreparationMinutes === "number" &&
      Number.isFinite(settings.minPreparationMinutes) &&
      settings.minPreparationMinutes >= 0
        ? Math.trunc(settings.minPreparationMinutes)
        : DEFAULT_MIN_PREPARATION_MINUTES,
    closedDates: Array.from(new Set(readDateStringArray(settings.closedDates))),
    specialDates: readSpecialDates(settings.specialDates),
    serviceZones:
      Array.isArray(settings.serviceZones) &&
      settings.serviceZones.every((zone) => typeof zone === "string")
        ? settings.serviceZones
        : [],
    customerMessage:
      typeof settings.customerMessage === "string" && settings.customerMessage.trim().length > 0
        ? settings.customerMessage.trim()
        : null,
  } satisfies OrderingSettings;
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function buildPickupSlot(date: string, time: string) {
  return `${date}T${time}`;
}

function getTimeZoneParts(date: Date, timeZone = PICKUP_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hourNumber = Number(values.hour === "24" ? "00" : values.hour);
  const minuteNumber = Number(values.minute);

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: hourNumber,
    minute: minuteNumber,
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${String(hourNumber).padStart(2, "0")}:${String(minuteNumber).padStart(2, "0")}`,
  };
}

function addDaysToDateString(date: string, days: number) {
  const base = new Date(`${date}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function localDateTimeToUtc(date: string, time: string, timeZone = PICKUP_TIME_ZONE) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desiredUtcMinutes = Date.UTC(year, month - 1, day, hour, minute) / 60_000;
  let candidate = new Date(Date.UTC(year, month - 1, day, hour, minute));

  for (let index = 0; index < 4; index += 1) {
    const parts = getTimeZoneParts(candidate, timeZone);
    const actualUtcMinutes =
      Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) / 60_000;
    const diff = desiredUtcMinutes - actualUtcMinutes;

    if (diff === 0) {
      break;
    }

    candidate = new Date(candidate.getTime() + diff * 60_000);
  }

  return candidate;
}

function getPickupAvailabilityConfig(settings: OrderingSettings) {
  return {
    startTime: settings.openingTimeStart ?? DEFAULT_PICKUP_START_TIME,
    endTime: settings.openingTimeEnd ?? DEFAULT_PICKUP_END_TIME,
    slotMinutes: Math.max(settings.slotMinutes || DEFAULT_SLOT_MINUTES, 5),
    maxOrdersPerSlot: Math.max(settings.maxOrdersPerSlot || DEFAULT_MAX_ORDERS_PER_SLOT, 1),
    minPreparationMinutes: Math.max(
      settings.minPreparationMinutes || DEFAULT_MIN_PREPARATION_MINUTES,
      0,
    ),
    openingDays: settings.openingDays,
  };
}

function getSpecialDateOverride(settings: OrderingSettings, date: string) {
  return settings.specialDates.find((entry) => entry.date === date) ?? null;
}

function getPickupAvailabilityConfigForDate(settings: OrderingSettings, date: string) {
  const base = getPickupAvailabilityConfig(settings);
  const override = getSpecialDateOverride(settings, date);

  if (!override) {
    return base;
  }

  return {
    ...base,
    startTime: override.openingTimeStart ?? base.startTime,
    endTime: override.openingTimeEnd ?? base.endTime,
    slotMinutes: override.slotMinutes ?? base.slotMinutes,
    maxOrdersPerSlot: override.maxOrdersPerSlot ?? base.maxOrdersPerSlot,
    minPreparationMinutes: override.minPreparationMinutes ?? base.minPreparationMinutes,
  };
}

function getPlatformNow() {
  const now = getTimeZoneParts(new Date(), PICKUP_TIME_ZONE);

  return {
    date: now.date,
    minutes: timeToMinutes(now.time),
  };
}

function isClosedDate(date: string, settings: OrderingSettings) {
  const override = getSpecialDateOverride(settings, date);

  if (override?.closed) {
    return true;
  }

  if (override) {
    return false;
  }

  if (settings.closedDates.includes(date)) {
    return true;
  }

  const weekday = new Date(`${date}T12:00:00`).getDay();

  if (settings.openingDays.length > 0) {
    return !settings.openingDays.includes(WEEKDAY_CODE_BY_INDEX[weekday]);
  }

  return DEFAULT_CLOSED_WEEKDAYS.includes(weekday);
}

function isPastSlot(date: string, time: string, settings: OrderingSettings) {
  const now = getPlatformNow();
  const config = getPickupAvailabilityConfigForDate(settings, date);

  if (date < now.date) {
    return true;
  }

  if (date > now.date) {
    return false;
  }

  return timeToMinutes(time) < now.minutes + config.minPreparationMinutes;
}

function generateSlots(date: string, settings: OrderingSettings) {
  const config = getPickupAvailabilityConfigForDate(settings, date);
  const start = timeToMinutes(config.startTime);
  const end = timeToMinutes(config.endTime);
  const slots: Array<{
    time: string;
    pickupSlot: string;
    pickupAt: string;
  }> = [];

  for (let current = start; current <= end; current += config.slotMinutes) {
    const time = minutesToTime(current);
    slots.push({
      time,
      pickupSlot: buildPickupSlot(date, time),
      pickupAt: localDateTimeToUtc(date, time).toISOString(),
    });
  }

  return slots;
}

export async function buildAvailability(business: OrderingBusiness, date: string) {
  const orderingSettings = getOrderingSettings(business);
  const config = getPickupAvailabilityConfigForDate(orderingSettings, date);

  if (isClosedDate(date, orderingSettings)) {
    return {
      date,
      closed: true,
      slotMinutes: config.slotMinutes,
      maxOrdersPerSlot: config.maxOrdersPerSlot,
      minPreparationMinutes: config.minPreparationMinutes,
      startTime: config.startTime,
      endTime: config.endTime,
      slots: [],
    };
  }

  const dayStart = localDateTimeToUtc(date, "00:00");
  const nextDayStart = localDateTimeToUtc(addDaysToDateString(date, 1), "00:00");
  const orders = await prisma.order.findMany({
    where: {
      businessId: business.id,
      status: {
        not: "cancelled",
      },
      pickupAt: {
        gte: dayStart,
        lt: nextDayStart,
      },
    },
    select: {
      pickupAt: true,
    },
  });

  const countBySlot = new Map<string, number>();

  for (const order of orders) {
    if (!order.pickupAt) {
      continue;
    }

    const parts = getTimeZoneParts(order.pickupAt, PICKUP_TIME_ZONE);

    if (parts.date !== date) {
      continue;
    }

    const slotId = buildPickupSlot(parts.date, parts.time);
    countBySlot.set(slotId, (countBySlot.get(slotId) ?? 0) + 1);
  }

  const slots = generateSlots(date, orderingSettings).map((slot) => {
    const count = countBySlot.get(slot.pickupSlot) ?? 0;
    const remaining = Math.max(config.maxOrdersPerSlot - count, 0);
    const past = isPastSlot(date, slot.time, orderingSettings);

    return {
      ...slot,
      count,
      remaining,
      full: remaining === 0,
      almostFull: remaining > 0 && remaining <= 1,
      past,
      available: !past && remaining > 0,
    };
  });

  return {
    date,
    closed: false,
    slotMinutes: config.slotMinutes,
    maxOrdersPerSlot: config.maxOrdersPerSlot,
    minPreparationMinutes: config.minPreparationMinutes,
    startTime: config.startTime,
    endTime: config.endTime,
    slots,
  };
}

export async function resolvePickupSelection(
  business: OrderingBusiness,
  payload: CreateOrderPayload,
) {
  let pickupDate = payload.pickupDate?.trim() ?? "";
  let pickupTime = payload.pickupTime?.trim() ?? "";
  let pickupSlot = payload.pickupSlot?.trim() ?? "";

  if ((!pickupDate || !pickupTime || !pickupSlot) && payload.pickupAt) {
    const parts = getTimeZoneParts(new Date(payload.pickupAt), PICKUP_TIME_ZONE);
    pickupDate = parts.date;
    pickupTime = parts.time;
    pickupSlot = buildPickupSlot(parts.date, parts.time);
  }

  if (!pickupDate || !pickupTime || !pickupSlot) {
    return {
      error: "Pickup date and slot are required",
    };
  }

  if (!DATE_RE.test(pickupDate)) {
    return {
      error: "pickupDate must use YYYY-MM-DD",
    };
  }

  if (!TIME_RE.test(pickupTime)) {
    return {
      error: "pickupTime must use HH:mm",
    };
  }

  if (pickupSlot !== buildPickupSlot(pickupDate, pickupTime)) {
    return {
      error: "pickupSlot does not match pickupDate and pickupTime",
    };
  }

  const availability = await buildAvailability(business, pickupDate);

  if (availability.closed) {
    return {
      error: "Selected day is closed",
    };
  }

  const selectedSlot = availability.slots.find((slot) => slot.pickupSlot === pickupSlot);

  if (!selectedSlot) {
    return {
      error: "Selected slot is not available",
    };
  }

  if (selectedSlot.past) {
    return {
      error: "Selected slot is already in the past",
    };
  }

  if (selectedSlot.full) {
    return {
      error: "Selected slot is already full",
    };
  }

  return {
    pickupDate,
    pickupTime,
    pickupSlot,
    pickupAt: new Date(selectedSlot.pickupAt),
  };
}
