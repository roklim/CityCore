import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { canAccess, getRequestAuth, requireAuth } from "./auth.js";
import { prisma } from "./database.js";

const optionalTrimmedString = z.string().trim().min(1);

const businessParamsSchema = z.object({
  citySlug: optionalTrimmedString.max(120),
  businessSlug: optionalTrimmedString.max(160),
});

const createMenuCategorySchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: optionalTrimmedString.max(160).optional(),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  active: z.boolean().default(true),
});

const createMenuItemSchema = z.object({
  categorySlug: optionalTrimmedString.max(160).optional(),
  name: z.string().trim().min(2).max(160),
  slug: optionalTrimmedString.max(160).optional(),
  description: optionalTrimmedString.max(2_000).optional(),
  price: z.number().positive().max(10_000),
  compareAtPrice: z.number().positive().max(10_000).optional(),
  available: z.boolean().default(true),
  featured: z.boolean().default(false),
  emoji: optionalTrimmedString.max(16).optional(),
  imageUrl: z.string().trim().url().max(500).optional(),
  unit: optionalTrimmedString.max(40).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(16).optional(),
  allergens: z.array(z.string().trim().min(1).max(40)).max(16).optional(),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});

const updateMenuItemSchema = z.object({
  categorySlug: optionalTrimmedString.max(160).nullable().optional(),
  name: z.string().trim().min(2).max(160).optional(),
  slug: optionalTrimmedString.max(160).optional(),
  description: optionalTrimmedString.max(2_000).nullable().optional(),
  price: z.number().positive().max(10_000).optional(),
  compareAtPrice: z.number().positive().max(10_000).nullable().optional(),
  available: z.boolean().optional(),
  featured: z.boolean().optional(),
  emoji: optionalTrimmedString.max(16).nullable().optional(),
  imageUrl: z.string().trim().url().max(500).nullable().optional(),
  unit: optionalTrimmedString.max(40).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(16).optional(),
  allergens: z.array(z.string().trim().min(1).max(40)).max(16).optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

const orderStatuses = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const WEEKDAY_CODE_BY_INDEX = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"] as const;
const PICKUP_TIME_ZONE = process.env.PICKUP_TIME_ZONE?.trim() || "Europe/Rome";
const DEFAULT_SLOT_MINUTES = 15;
const DEFAULT_MAX_ORDERS_PER_SLOT = 4;
const DEFAULT_MIN_PREPARATION_MINUTES = 30;
const DEFAULT_PICKUP_START_TIME = "18:00";
const DEFAULT_PICKUP_END_TIME = "22:30";
const DEFAULT_CLOSED_WEEKDAYS = [1];

const createOrderSchema = z.object({
  customerName: z.string().trim().min(2).max(160),
  customerPhone: optionalTrimmedString.max(40).optional(),
  customerEmail: z.string().trim().email().max(200).optional(),
  couponCode: optionalTrimmedString.max(80).optional(),
  pickupDate: z.string().regex(DATE_RE).optional(),
  pickupTime: z.string().regex(TIME_RE).optional(),
  pickupSlot: optionalTrimmedString.max(32).optional(),
  pickupAt: z.string().datetime({ offset: true }).optional(),
  notes: optionalTrimmedString.max(2_000).optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().trim().min(1).max(100),
        qty: z.number().int().min(1).max(20),
        notes: optionalTrimmedString.max(500).optional(),
      }),
    )
    .min(1)
    .max(50),
});

const listOrdersQuerySchema = z.object({
  status: z.enum(orderStatuses).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const orderParamsSchema = z.object({
  citySlug: optionalTrimmedString.max(120),
  businessSlug: optionalTrimmedString.max(160),
  orderId: z.string().trim().min(1).max(100),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatuses),
});

const customerLookupQuerySchema = z.object({
  phone: optionalTrimmedString.max(40).optional(),
  q: optionalTrimmedString.max(160).optional(),
  limit: z.coerce.number().int().positive().max(100).default(30),
});

const availabilityQuerySchema = z.object({
  date: z.string().regex(DATE_RE),
});

const orderingSpecialDateSchema = z.object({
  date: z.string().regex(DATE_RE),
  closed: z.boolean().optional(),
  openingTimeStart: z.string().regex(TIME_RE).optional(),
  openingTimeEnd: z.string().regex(TIME_RE).optional(),
  slotMinutes: z.number().int().min(5).max(180).optional(),
  maxOrdersPerSlot: z.number().int().min(1).max(500).optional(),
  minPreparationMinutes: z.number().int().min(0).max(720).optional(),
});

const orderingSettingsSchema = z.object({
  openingHours: optionalTrimmedString.max(120).optional(),
  openingDays: z
    .array(z.enum(["lun", "mar", "mer", "gio", "ven", "sab", "dom"]))
    .max(7)
    .optional(),
  openingTimeStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  openingTimeEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  deliveryCost: z.number().min(0).max(10_000).optional(),
  minimumOrder: z.number().min(0).max(10_000).optional(),
  slotMinutes: z.number().int().min(5).max(180).optional(),
  maxOrdersPerSlot: z.number().int().min(1).max(500).optional(),
  minPreparationMinutes: z.number().int().min(0).max(720).optional(),
  closedDates: z.array(z.string().regex(DATE_RE)).max(120).optional(),
  specialDates: z.array(orderingSpecialDateSchema).max(120).optional(),
  serviceZones: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  customerMessage: optionalTrimmedString.max(500).optional(),
});

const createCouponSchema = z.object({
  code: z.string().trim().min(2).max(80),
  type: z.enum(["percent", "fixed"]),
  value: z.number().positive().max(10_000),
  expiresAt: z.string().datetime({ offset: true }).optional(),
  usageLimit: z.number().int().min(0).max(1_000_000).default(0),
  active: z.boolean().default(true),
});

const updateCouponSchema = z.object({
  code: z.string().trim().min(2).max(80).optional(),
  type: z.enum(["percent", "fixed"]).optional(),
  value: z.number().positive().max(10_000).optional(),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  usageLimit: z.number().int().min(0).max(1_000_000).optional(),
  active: z.boolean().optional(),
});

const couponParamsSchema = z.object({
  citySlug: optionalTrimmedString.max(120),
  businessSlug: optionalTrimmedString.max(160),
  couponId: z.string().trim().min(1).max(100),
});

const menuItemParamsSchema = z.object({
  citySlug: optionalTrimmedString.max(120),
  businessSlug: optionalTrimmedString.max(160),
  itemId: z.string().trim().min(1).max(100),
});

const couponListQuerySchema = z.object({
  active: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePhone(value?: string) {
  return value ? value.replace(/\D/g, "") : null;
}

function parsePayload<T>(schema: z.ZodSchema<T>, payload: unknown) {
  const result = schema.safeParse(payload);

  if (!result.success) {
    return {
      success: false as const,
      response: {
        statusCode: 400,
        body: {
          status: "error",
          error: "Invalid request payload",
          details: z.treeifyError(result.error),
        },
      },
    };
  }

  return {
    success: true as const,
    data: result.data,
  };
}

function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  if (!value) {
    return null;
  }

  return Number(value.toString());
}

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

function mapMenuItem(item: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: Prisma.Decimal;
  compareAtPrice: Prisma.Decimal | null;
  available: boolean;
  featured: boolean;
  emoji: string | null;
  imageUrl: string | null;
  unit: string | null;
  tagsJson: Prisma.JsonValue | null;
  allergensJson: Prisma.JsonValue | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description,
    price: decimalToNumber(item.price),
    compareAtPrice: decimalToNumber(item.compareAtPrice),
    available: item.available,
    featured: item.featured,
    emoji: item.emoji,
    imageUrl: item.imageUrl,
    unit: item.unit,
    tags: Array.isArray(item.tagsJson) ? item.tagsJson : [],
    allergens: Array.isArray(item.allergensJson) ? item.allergensJson : [],
    sortOrder: item.sortOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function mapMenuCategory(category: {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  items?: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: Prisma.Decimal;
    compareAtPrice: Prisma.Decimal | null;
    available: boolean;
    featured: boolean;
    emoji: string | null;
    imageUrl: string | null;
    unit: string | null;
    tagsJson: Prisma.JsonValue | null;
    allergensJson: Prisma.JsonValue | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
}) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    sortOrder: category.sortOrder,
    active: category.active,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    items: category.items?.map(mapMenuItem) ?? [],
  };
}

function mapOrder(order: {
  id: string;
  couponCode: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  status: "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";
  fulfillmentType: "pickup" | "delivery";
  pickupAt: Date | null;
  notes: string | null;
  subtotal: Prisma.Decimal;
  discountTotal: Prisma.Decimal;
  serviceFee: Prisma.Decimal;
  deliveryFee: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  source: "web" | "admin" | "phone";
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    menuItemId: string | null;
    nameSnapshot: string;
    priceSnapshot: Prisma.Decimal;
    qty: number;
    notes: string | null;
    lineTotal: Prisma.Decimal;
  }>;
}) {
  return {
    id: order.id,
    couponCode: order.couponCode,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    pickupAt: order.pickupAt,
    notes: order.notes,
    subtotal: decimalToNumber(order.subtotal),
    discountTotal: decimalToNumber(order.discountTotal),
    serviceFee: decimalToNumber(order.serviceFee),
    deliveryFee: decimalToNumber(order.deliveryFee),
    grandTotal: decimalToNumber(order.grandTotal),
    paymentStatus: order.paymentStatus,
    source: order.source,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.nameSnapshot,
      price: Number(item.priceSnapshot.toString()),
      qty: item.qty,
      notes: item.notes,
      lineTotal: Number(item.lineTotal.toString()),
    })),
  };
}

function mapCoupon(coupon: {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: Prisma.Decimal;
  expiresAt: Date | null;
  usageLimit: number;
  usedCount: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: decimalToNumber(coupon.value),
    expiresAt: coupon.expiresAt,
    usageLimit: coupon.usageLimit,
    usedCount: coupon.usedCount,
    active: coupon.active,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };
}

function mapCustomerProfile(customer: {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  points: number;
  totalOrders: number;
  completedOrders: number;
  lastOrderAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    points: customer.points,
    totalOrders: customer.totalOrders,
    completedOrders: customer.completedOrders,
    lastOrderAt: customer.lastOrderAt,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

async function findBusinessForOrdering(citySlug: string, businessSlug: string) {
  return prisma.business.findFirst({
    where: {
      slug: businessSlug,
      city: {
        slug: citySlug,
      },
    },
    include: {
      city: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          active: true,
        },
      },
      template: {
        select: {
          id: true,
          code: true,
          name: true,
          primaryModule: true,
          defaultCtaLabel: true,
        },
      },
      modules: {
        where: {
          active: true,
        },
        orderBy: {
          moduleCode: "asc",
        },
        select: {
          id: true,
          moduleCode: true,
          active: true,
          settingsJson: true,
        },
      },
    },
  });
}

function hasOrderingEnabled(business: Awaited<ReturnType<typeof findBusinessForOrdering>>) {
  if (!business) {
    return false;
  }

  return (
    business.template.primaryModule === "ordering" ||
    business.modules.some((entry) => entry.moduleCode === "ordering")
  );
}

type OrderingSettings = {
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

function getOrderingSettings(business: Awaited<ReturnType<typeof findBusinessForOrdering>>) {
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

async function buildAvailability(
  business: NonNullable<Awaited<ReturnType<typeof findBusinessForOrdering>>>,
  date: string,
) {
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

async function resolvePickupSelection(
  business: NonNullable<Awaited<ReturnType<typeof findBusinessForOrdering>>>,
  payload: z.infer<typeof createOrderSchema>,
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

export function registerOrderingRoutes(app: FastifyInstance) {
  app.get("/api/v2/ordering", async () => ({
    status: "ok",
    milestone: "ordering-slice-3",
    capabilities: {
      publicMenu: ["/api/v2/ordering/public/:citySlug/:businessSlug/menu"],
      publicAvailability: ["/api/v2/ordering/public/:citySlug/:businessSlug/availability"],
      adminMenu: ["/api/v2/ordering/businesses/:citySlug/:businessSlug/menu"],
      publicCustomerLookup: ["/api/v2/ordering/public/:citySlug/:businessSlug/customers/lookup"],
      adminCustomers: ["/api/v2/ordering/businesses/:citySlug/:businessSlug/customers"],
      adminCoupons: ["/api/v2/ordering/businesses/:citySlug/:businessSlug/coupons"],
      adminSettings: ["/api/v2/ordering/businesses/:citySlug/:businessSlug/settings"],
    },
  }));

  app.get("/api/v2/ordering/public/:citySlug/:businessSlug/menu", async (request, reply) => {
    const parsed = parsePayload(businessParamsSchema, request.params);

    if (!parsed.success) {
      return reply.code(parsed.response.statusCode).send(parsed.response.body);
    }

    const business = await findBusinessForOrdering(parsed.data.citySlug, parsed.data.businessSlug);

    if (
      !business ||
      business.status !== "active" ||
      !business.city.active ||
      business.city.status === "disabled"
    ) {
      return reply.code(404).send({
        status: "error",
        error: "Business not found",
      });
    }

    if (!hasOrderingEnabled(business)) {
      return reply.code(404).send({
        status: "error",
        error: "Ordering is not enabled for this business",
      });
    }

    const orderingSettings = getOrderingSettings(business);

    const categories = await prisma.menuCategory.findMany({
      where: {
        businessId: business.id,
        active: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        items: {
          where: {
            available: true,
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
    });

    return reply.send({
      status: "ok",
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        publicTitle: business.publicTitle,
        publicSubtitle: business.publicSubtitle,
        publicDescription: business.publicDescription,
        city: business.city,
        template: business.template,
      },
      settings: orderingSettings,
      categories: categories.map(mapMenuCategory),
    });
  });

  app.get(
    "/api/v2/ordering/public/:citySlug/:businessSlug/customers/lookup",
    async (request, reply) => {
      const paramsParsed = parsePayload(businessParamsSchema, request.params);
      const queryParsed = parsePayload(customerLookupQuerySchema, request.query);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
      }

      if (!queryParsed.success) {
        return reply.code(queryParsed.response.statusCode).send(queryParsed.response.body);
      }

      const phone = normalizePhone(queryParsed.data.phone);

      if (!phone || phone.length < 6) {
        return reply.code(400).send({
          status: "error",
          error: "Valid phone number required",
        });
      }

      const business = await findBusinessForOrdering(
        paramsParsed.data.citySlug,
        paramsParsed.data.businessSlug,
      );

      if (!business || !hasOrderingEnabled(business)) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      const customer = await prisma.customerProfile.findFirst({
        where: {
          businessId: business.id,
          phone,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          points: true,
          totalOrders: true,
          completedOrders: true,
          lastOrderAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const lastOrder = await prisma.order.findFirst({
        where: {
          businessId: business.id,
          customerPhone: phone,
          status: {
            not: "cancelled",
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          items: true,
        },
      });

      if (!customer) {
        return reply.send({
          status: "ok",
          found: false,
        });
      }

      return reply.send({
        status: "ok",
        found: true,
        customer: mapCustomerProfile(customer),
        lastOrder: lastOrder ? mapOrder(lastOrder) : null,
      });
    },
  );

  app.get(
    "/api/v2/ordering/public/:citySlug/:businessSlug/availability",
    async (request, reply) => {
      const paramsParsed = parsePayload(businessParamsSchema, request.params);
      const queryParsed = parsePayload(availabilityQuerySchema, request.query);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
      }

      if (!queryParsed.success) {
        return reply.code(queryParsed.response.statusCode).send(queryParsed.response.body);
      }

      const business = await findBusinessForOrdering(
        paramsParsed.data.citySlug,
        paramsParsed.data.businessSlug,
      );

      if (
        !business ||
        business.status !== "active" ||
        !business.city.active ||
        business.city.status === "disabled"
      ) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (!hasOrderingEnabled(business)) {
        return reply.code(404).send({
          status: "error",
          error: "Ordering is not enabled for this business",
        });
      }

      return reply.send({
        status: "ok",
        ...(await buildAvailability(business, queryParsed.data.date)),
      });
    },
  );

  app.get(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/menu",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = parsePayload(businessParamsSchema, request.params);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        parsed.data.citySlug,
        parsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "businesses.read", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const categories = await prisma.menuCategory.findMany({
        where: {
          businessId: business.id,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          items: {
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
        },
      });

      return reply.send({
        status: "ok",
        business: {
          id: business.id,
          name: business.name,
          slug: business.slug,
          status: business.status,
          city: business.city,
          orderingEnabled: hasOrderingEnabled(business),
        },
        categories: categories.map(mapMenuCategory),
      });
    },
  );

  app.post(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/categories",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(businessParamsSchema, request.params);
      const bodyParsed = parsePayload(createMenuCategorySchema, request.body);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
      }

      if (!bodyParsed.success) {
        return reply.code(bodyParsed.response.statusCode).send(bodyParsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        paramsParsed.data.citySlug,
        paramsParsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "menu.manage", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      try {
        const category = await prisma.$transaction(async (tx) => {
          const createdCategory = await tx.menuCategory.create({
            data: {
              businessId: business.id,
              name: bodyParsed.data.name,
              slug: slugify(bodyParsed.data.slug ?? bodyParsed.data.name),
              sortOrder: bodyParsed.data.sortOrder,
              active: bodyParsed.data.active,
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: auth.user.id,
              action: "ordering.menu_category.created",
              targetType: "menu_category",
              targetId: createdCategory.id,
              scopeType: "business",
              cityId: business.city.id,
              businessId: business.id,
              metadataJson: {
                slug: createdCategory.slug,
                name: createdCategory.name,
              },
            },
          });

          return createdCategory;
        });

        return reply.code(201).send({
          status: "ok",
          item: mapMenuCategory(category),
        });
      } catch (error) {
        if (isPrismaError(error, "P2002")) {
          return reply.code(409).send({
            status: "error",
            error: "A menu category with the same slug already exists for this business.",
          });
        }

        throw error;
      }
    },
  );

  app.post(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/items",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(businessParamsSchema, request.params);
      const bodyParsed = parsePayload(createMenuItemSchema, request.body);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
      }

      if (!bodyParsed.success) {
        return reply.code(bodyParsed.response.statusCode).send(bodyParsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        paramsParsed.data.citySlug,
        paramsParsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "menu.manage", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const category = bodyParsed.data.categorySlug
        ? await prisma.menuCategory.findFirst({
            where: {
              businessId: business.id,
              slug: bodyParsed.data.categorySlug,
            },
            select: {
              id: true,
              slug: true,
            },
          })
        : null;

      if (bodyParsed.data.categorySlug && !category) {
        return reply.code(404).send({
          status: "error",
          error: "Menu category not found",
        });
      }

      try {
        const item = await prisma.$transaction(async (tx) => {
          const createdItem = await tx.menuItem.create({
            data: {
              businessId: business.id,
              categoryId: category?.id ?? null,
              name: bodyParsed.data.name,
              slug: slugify(bodyParsed.data.slug ?? bodyParsed.data.name),
              description: bodyParsed.data.description ?? null,
              price: new Prisma.Decimal(bodyParsed.data.price),
              compareAtPrice:
                bodyParsed.data.compareAtPrice != null
                  ? new Prisma.Decimal(bodyParsed.data.compareAtPrice)
                  : null,
              available: bodyParsed.data.available,
              featured: bodyParsed.data.featured,
              emoji: bodyParsed.data.emoji ?? null,
              imageUrl: bodyParsed.data.imageUrl ?? null,
              unit: bodyParsed.data.unit ?? null,
              tagsJson: bodyParsed.data.tags ?? Prisma.JsonNull,
              allergensJson: bodyParsed.data.allergens ?? Prisma.JsonNull,
              sortOrder: bodyParsed.data.sortOrder,
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: auth.user.id,
              action: "ordering.menu_item.created",
              targetType: "menu_item",
              targetId: createdItem.id,
              scopeType: "business",
              cityId: business.city.id,
              businessId: business.id,
              metadataJson: {
                slug: createdItem.slug,
                name: createdItem.name,
                categorySlug: category?.slug ?? null,
              },
            },
          });

          return createdItem;
        });

        return reply.code(201).send({
          status: "ok",
          item: mapMenuItem(item),
        });
      } catch (error) {
        if (isPrismaError(error, "P2002")) {
          return reply.code(409).send({
            status: "error",
            error: "A menu item with the same slug already exists for this business.",
          });
        }

        throw error;
      }
    },
  );

  app.patch(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/items/:itemId",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(menuItemParamsSchema, request.params);
      const bodyParsed = parsePayload(updateMenuItemSchema, request.body);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
      }

      if (!bodyParsed.success) {
        return reply.code(bodyParsed.response.statusCode).send(bodyParsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        paramsParsed.data.citySlug,
        paramsParsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "menu.manage", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const existingItem = await prisma.menuItem.findFirst({
        where: {
          id: paramsParsed.data.itemId,
          businessId: business.id,
        },
        select: {
          id: true,
          categoryId: true,
        },
      });

      if (!existingItem) {
        return reply.code(404).send({
          status: "error",
          error: "Menu item not found",
        });
      }

      let categoryId = existingItem.categoryId;
      let categorySlug: string | null = null;

      if (bodyParsed.data.categorySlug !== undefined) {
        if (bodyParsed.data.categorySlug === null) {
          categoryId = null;
        } else {
          const category = await prisma.menuCategory.findFirst({
            where: {
              businessId: business.id,
              slug: bodyParsed.data.categorySlug,
            },
            select: {
              id: true,
              slug: true,
            },
          });

          if (!category) {
            return reply.code(404).send({
              status: "error",
              error: "Menu category not found",
            });
          }

          categoryId = category.id;
          categorySlug = category.slug;
        }
      }

      try {
        const item = await prisma.$transaction(async (tx) => {
          const updatedItem = await tx.menuItem.update({
            where: {
              id: existingItem.id,
            },
            data: {
              categoryId,
              ...(bodyParsed.data.name !== undefined ? { name: bodyParsed.data.name } : {}),
              ...(bodyParsed.data.slug !== undefined
                ? { slug: slugify(bodyParsed.data.slug) }
                : {}),
              ...(bodyParsed.data.description !== undefined
                ? { description: bodyParsed.data.description ?? null }
                : {}),
              ...(bodyParsed.data.price !== undefined
                ? { price: new Prisma.Decimal(bodyParsed.data.price) }
                : {}),
              ...(bodyParsed.data.compareAtPrice !== undefined
                ? {
                    compareAtPrice:
                      bodyParsed.data.compareAtPrice != null
                        ? new Prisma.Decimal(bodyParsed.data.compareAtPrice)
                        : null,
                  }
                : {}),
              ...(bodyParsed.data.available !== undefined
                ? { available: bodyParsed.data.available }
                : {}),
              ...(bodyParsed.data.featured !== undefined
                ? { featured: bodyParsed.data.featured }
                : {}),
              ...(bodyParsed.data.emoji !== undefined
                ? { emoji: bodyParsed.data.emoji ?? null }
                : {}),
              ...(bodyParsed.data.imageUrl !== undefined
                ? { imageUrl: bodyParsed.data.imageUrl ?? null }
                : {}),
              ...(bodyParsed.data.unit !== undefined ? { unit: bodyParsed.data.unit ?? null } : {}),
              ...(bodyParsed.data.tags !== undefined ? { tagsJson: bodyParsed.data.tags } : {}),
              ...(bodyParsed.data.allergens !== undefined
                ? { allergensJson: bodyParsed.data.allergens }
                : {}),
              ...(bodyParsed.data.sortOrder !== undefined
                ? { sortOrder: bodyParsed.data.sortOrder }
                : {}),
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: auth.user.id,
              action: "ordering.menu_item.updated",
              targetType: "menu_item",
              targetId: updatedItem.id,
              scopeType: "business",
              cityId: business.city.id,
              businessId: business.id,
              metadataJson: {
                categorySlug,
                fields: Object.keys(bodyParsed.data),
              },
            },
          });

          return updatedItem;
        });

        return reply.send({
          status: "ok",
          item: mapMenuItem(item),
        });
      } catch (error) {
        if (isPrismaError(error, "P2002")) {
          return reply.code(409).send({
            status: "error",
            error: "A menu item with the same slug already exists for this business.",
          });
        }

        throw error;
      }
    },
  );

  app.patch(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/items/:itemId/availability",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(menuItemParamsSchema, request.params);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        paramsParsed.data.citySlug,
        paramsParsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "menu.manage", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const item = await prisma.menuItem.findFirst({
        where: {
          id: paramsParsed.data.itemId,
          businessId: business.id,
        },
        select: {
          id: true,
          available: true,
        },
      });

      if (!item) {
        return reply.code(404).send({
          status: "error",
          error: "Menu item not found",
        });
      }

      const updatedItem = await prisma.$transaction(async (tx) => {
        const next = await tx.menuItem.update({
          where: {
            id: item.id,
          },
          data: {
            available: !item.available,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: auth.user.id,
            action: "ordering.menu_item.availability_toggled",
            targetType: "menu_item",
            targetId: next.id,
            scopeType: "business",
            cityId: business.city.id,
            businessId: business.id,
            metadataJson: {
              available: next.available,
            },
          },
        });

        return next;
      });

      return reply.send({
        status: "ok",
        item: mapMenuItem(updatedItem),
      });
    },
  );

  app.delete(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/items/:itemId",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(menuItemParamsSchema, request.params);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        paramsParsed.data.citySlug,
        paramsParsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "menu.manage", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const item = await prisma.menuItem.findFirst({
        where: {
          id: paramsParsed.data.itemId,
          businessId: business.id,
        },
        select: {
          id: true,
          slug: true,
          name: true,
        },
      });

      if (!item) {
        return reply.code(404).send({
          status: "error",
          error: "Menu item not found",
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.menuItem.delete({
          where: {
            id: item.id,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: auth.user.id,
            action: "ordering.menu_item.deleted",
            targetType: "menu_item",
            targetId: item.id,
            scopeType: "business",
            cityId: business.city.id,
            businessId: business.id,
            metadataJson: {
              slug: item.slug,
              name: item.name,
            },
          },
        });
      });

      return reply.send({
        status: "ok",
        deleted: true,
      });
    },
  );

  app.post("/api/v2/ordering/public/:citySlug/:businessSlug/orders", async (request, reply) => {
    const paramsParsed = parsePayload(businessParamsSchema, request.params);
    const bodyParsed = parsePayload(createOrderSchema, request.body);

    if (!paramsParsed.success) {
      return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
    }

    if (!bodyParsed.success) {
      return reply.code(bodyParsed.response.statusCode).send(bodyParsed.response.body);
    }

    const business = await findBusinessForOrdering(
      paramsParsed.data.citySlug,
      paramsParsed.data.businessSlug,
    );

    if (
      !business ||
      business.status !== "active" ||
      !business.city.active ||
      business.city.status === "disabled"
    ) {
      return reply.code(404).send({
        status: "error",
        error: "Business not found",
      });
    }

    if (!hasOrderingEnabled(business)) {
      return reply.code(404).send({
        status: "error",
        error: "Ordering is not enabled for this business",
      });
    }

    const orderingSettings = getOrderingSettings(business);
    const pickupSelection = await resolvePickupSelection(business, bodyParsed.data);

    if ("error" in pickupSelection) {
      return reply.code(400).send({
        status: "error",
        error: pickupSelection.error,
      });
    }

    const menuItemIds = bodyParsed.data.items.map((item) => item.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: {
        businessId: business.id,
        id: {
          in: menuItemIds,
        },
        available: true,
      },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    if (menuItems.length !== menuItemIds.length) {
      return reply.code(400).send({
        status: "error",
        error: "One or more menu items are not available",
      });
    }

    const menuItemById = new Map(menuItems.map((item) => [item.id, item]));
    const normalizedPhone = normalizePhone(bodyParsed.data.customerPhone);
    const normalizedCouponCode = bodyParsed.data.couponCode?.trim().toUpperCase() ?? null;
    const itemsPreview = bodyParsed.data.items.map((item) => {
      const menuItem = menuItemById.get(item.menuItemId);

      if (!menuItem) {
        throw new Error("MENU_ITEM_NOT_FOUND");
      }

      const priceSnapshot = new Prisma.Decimal(menuItem.price.toString());
      const lineTotal = priceSnapshot.mul(item.qty);

      return {
        menuItemId: menuItem.id,
        nameSnapshot: menuItem.name,
        priceSnapshot,
        qty: item.qty,
        notes: item.notes ?? null,
        lineTotal,
      };
    });

    const subtotal = itemsPreview.reduce(
      (sum, item) => sum.plus(item.lineTotal),
      new Prisma.Decimal(0),
    );

    if (
      orderingSettings.minimumOrder > 0 &&
      subtotal.lessThan(new Prisma.Decimal(orderingSettings.minimumOrder))
    ) {
      return reply.code(400).send({
        status: "error",
        error: `Minimum order is ${orderingSettings.minimumOrder.toFixed(2)} EUR`,
      });
    }

    try {
      const order = await prisma.$transaction(async (tx) => {
        let customerProfileId: string | null = null;
        let couponId: string | null = null;
        let couponCode: string | null = null;
        let discountTotal = new Prisma.Decimal(0);

        if (normalizedPhone) {
          const existingProfile = await tx.customerProfile.findFirst({
            where: {
              businessId: business.id,
              phone: normalizedPhone,
            },
            select: {
              id: true,
              totalOrders: true,
            },
          });

          if (existingProfile) {
            customerProfileId = existingProfile.id;

            await tx.customerProfile.update({
              where: {
                id: existingProfile.id,
              },
              data: {
                name: bodyParsed.data.customerName,
                email: bodyParsed.data.customerEmail ?? null,
                lastOrderAt: new Date(),
                totalOrders: {
                  increment: 1,
                },
              },
            });
          } else {
            const createdProfile = await tx.customerProfile.create({
              data: {
                businessId: business.id,
                name: bodyParsed.data.customerName,
                phone: normalizedPhone,
                email: bodyParsed.data.customerEmail ?? null,
                totalOrders: 1,
                lastOrderAt: new Date(),
              },
              select: {
                id: true,
              },
            });

            customerProfileId = createdProfile.id;
          }
        }

        if (normalizedCouponCode) {
          const coupon = await tx.coupon.findFirst({
            where: {
              businessId: business.id,
              code: normalizedCouponCode,
              active: true,
            },
            select: {
              id: true,
              code: true,
              type: true,
              value: true,
              expiresAt: true,
              usageLimit: true,
              usedCount: true,
            },
          });

          if (!coupon) {
            throw new Error("COUPON_NOT_FOUND");
          }

          if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
            throw new Error("COUPON_EXPIRED");
          }

          if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
            throw new Error("COUPON_USAGE_LIMIT_REACHED");
          }

          couponId = coupon.id;
          couponCode = coupon.code;
          discountTotal =
            coupon.type === "percent"
              ? subtotal.mul(coupon.value).div(100).toDecimalPlaces(2)
              : Prisma.Decimal.min(subtotal, new Prisma.Decimal(coupon.value.toString()));
        }

        const grandTotal = Prisma.Decimal.max(new Prisma.Decimal(0), subtotal.minus(discountTotal));

        const createdOrder = await tx.order.create({
          data: {
            businessId: business.id,
            customerProfileId,
            couponId,
            couponCode,
            customerName: bodyParsed.data.customerName,
            customerPhone: normalizedPhone,
            customerEmail: bodyParsed.data.customerEmail ?? null,
            status: "pending",
            fulfillmentType: "pickup",
            pickupAt: pickupSelection.pickupAt,
            notes: bodyParsed.data.notes ?? null,
            subtotal,
            discountTotal,
            serviceFee: new Prisma.Decimal(0),
            deliveryFee: new Prisma.Decimal(0),
            grandTotal,
            paymentStatus: "pending",
            source: "web",
            items: {
              create: itemsPreview,
            },
          },
          include: {
            items: true,
          },
        });

        if (couponId) {
          await tx.coupon.update({
            where: {
              id: couponId,
            },
            data: {
              usedCount: {
                increment: 1,
              },
            },
          });
        }

        await tx.auditLog.create({
          data: {
            action: "ordering.order.created",
            targetType: "order",
            targetId: createdOrder.id,
            scopeType: "business",
            cityId: business.city.id,
            businessId: business.id,
            metadataJson: {
              source: "web",
              items: createdOrder.items.length,
              couponCode,
              pickupDate: pickupSelection.pickupDate,
              pickupTime: pickupSelection.pickupTime,
              pickupSlot: pickupSelection.pickupSlot,
            },
          },
        });

        return createdOrder;
      });

      return reply.code(201).send({
        status: "ok",
        order: mapOrder(order),
        trackingPath: `/${business.city.slug}/${business.slug}/ordine/${order.id}`,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "COUPON_NOT_FOUND") {
        return reply.code(404).send({
          status: "error",
          error: "Coupon not found",
        });
      }

      if (error instanceof Error && error.message === "COUPON_EXPIRED") {
        return reply.code(400).send({
          status: "error",
          error: "Coupon expired",
        });
      }

      if (error instanceof Error && error.message === "COUPON_USAGE_LIMIT_REACHED") {
        return reply.code(409).send({
          status: "error",
          error: "Coupon usage limit reached",
        });
      }

      throw error;
    }
  });

  app.get(
    "/api/v2/ordering/public/:citySlug/:businessSlug/orders/:orderId",
    async (request, reply) => {
      const parsed = parsePayload(orderParamsSchema, request.params);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const business = await findBusinessForOrdering(
        parsed.data.citySlug,
        parsed.data.businessSlug,
      );

      if (!business || !hasOrderingEnabled(business)) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      const order = await prisma.order.findFirst({
        where: {
          id: parsed.data.orderId,
          businessId: business.id,
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        return reply.code(404).send({
          status: "error",
          error: "Order not found",
        });
      }

      return reply.send({
        status: "ok",
        order: mapOrder(order),
      });
    },
  );

  app.get(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/orders",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(businessParamsSchema, request.params);
      const queryParsed = parsePayload(listOrdersQuerySchema, request.query);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
      }

      if (!queryParsed.success) {
        return reply.code(queryParsed.response.statusCode).send(queryParsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        paramsParsed.data.citySlug,
        paramsParsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "orders.read", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const orders = await prisma.order.findMany({
        where: {
          businessId: business.id,
          status: queryParsed.data.status,
        },
        orderBy: [{ createdAt: "desc" }],
        take: queryParsed.data.limit,
        include: {
          items: true,
        },
      });

      return reply.send({
        status: "ok",
        items: orders.map(mapOrder),
      });
    },
  );

  app.get(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/orders/stats",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = parsePayload(businessParamsSchema, request.params);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        parsed.data.citySlug,
        parsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "orders.read", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const orders = await prisma.order.findMany({
        where: {
          businessId: business.id,
        },
        select: {
          status: true,
          grandTotal: true,
        },
      });

      const summary = {
        total: orders.length,
        open: 0,
        pending: 0,
        confirmed: 0,
        preparing: 0,
        ready: 0,
        completed: 0,
        cancelled: 0,
        revenue: 0,
      };

      for (const order of orders) {
        summary[order.status] += 1;

        if (["pending", "confirmed", "preparing", "ready"].includes(order.status)) {
          summary.open += 1;
        }

        if (order.status !== "cancelled") {
          summary.revenue += Number(order.grandTotal.toString());
        }
      }

      return reply.send({
        status: "ok",
        summary,
      });
    },
  );

  app.get(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/customers",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(businessParamsSchema, request.params);
      const queryParsed = parsePayload(customerLookupQuerySchema, request.query);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
      }

      if (!queryParsed.success) {
        return reply.code(queryParsed.response.statusCode).send(queryParsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        paramsParsed.data.citySlug,
        paramsParsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "customers.read", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const query = queryParsed.data.q?.trim() ?? "";
      const normalizedPhone = normalizePhone(queryParsed.data.phone ?? query);
      const customers = await prisma.customerProfile.findMany({
        where: {
          businessId: business.id,
          OR: query
            ? [
                {
                  name: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                ...(normalizedPhone
                  ? [
                      {
                        phone: {
                          contains: normalizedPhone,
                        },
                      },
                    ]
                  : []),
              ]
            : undefined,
        },
        orderBy: [{ lastOrderAt: "desc" }, { updatedAt: "desc" }],
        take: queryParsed.data.limit,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          points: true,
          totalOrders: true,
          completedOrders: true,
          lastOrderAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const totals = await prisma.order.groupBy({
        by: ["customerProfileId"],
        where: {
          businessId: business.id,
          customerProfileId: {
            in: customers.map((customer) => customer.id),
          },
          status: {
            not: "cancelled",
          },
        },
        _sum: {
          grandTotal: true,
        },
      });

      const totalByCustomerId = new Map(
        totals.map((entry) => [
          entry.customerProfileId,
          decimalToNumber(entry._sum.grandTotal) ?? 0,
        ]),
      );

      return reply.send({
        status: "ok",
        items: customers.map((customer) => ({
          ...mapCustomerProfile(customer),
          totalSpent: totalByCustomerId.get(customer.id) ?? 0,
        })),
      });
    },
  );

  app.get(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/settings",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = parsePayload(businessParamsSchema, request.params);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        parsed.data.citySlug,
        parsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "settings.manage", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      return reply.send({
        status: "ok",
        settings: getOrderingSettings(business),
      });
    },
  );

  app.put(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/settings",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(businessParamsSchema, request.params);
      const bodyParsed = parsePayload(orderingSettingsSchema, request.body);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
      }

      if (!bodyParsed.success) {
        return reply.code(bodyParsed.response.statusCode).send(bodyParsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        paramsParsed.data.citySlug,
        paramsParsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "settings.manage", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const settings = {
        openingHours: bodyParsed.data.openingHours ?? null,
        openingDays: bodyParsed.data.openingDays ?? [],
        openingTimeStart: bodyParsed.data.openingTimeStart ?? null,
        openingTimeEnd: bodyParsed.data.openingTimeEnd ?? null,
        deliveryCost: bodyParsed.data.deliveryCost ?? 0,
        minimumOrder: bodyParsed.data.minimumOrder ?? 0,
        slotMinutes: bodyParsed.data.slotMinutes ?? DEFAULT_SLOT_MINUTES,
        maxOrdersPerSlot: bodyParsed.data.maxOrdersPerSlot ?? DEFAULT_MAX_ORDERS_PER_SLOT,
        minPreparationMinutes:
          bodyParsed.data.minPreparationMinutes ?? DEFAULT_MIN_PREPARATION_MINUTES,
        closedDates: Array.from(new Set(bodyParsed.data.closedDates ?? [])),
        specialDates: Array.from(
          new Map(
            (bodyParsed.data.specialDates ?? []).map((entry) => [entry.date, entry]),
          ).values(),
        ),
        serviceZones: bodyParsed.data.serviceZones ?? [],
        customerMessage: bodyParsed.data.customerMessage ?? null,
      };

      if (
        settings.openingTimeStart &&
        settings.openingTimeEnd &&
        settings.openingTimeStart >= settings.openingTimeEnd
      ) {
        return reply.code(400).send({
          status: "error",
          error: "Closing time must be after opening time",
        });
      }

      for (const entry of settings.specialDates) {
        if (
          entry.openingTimeStart &&
          entry.openingTimeEnd &&
          entry.openingTimeStart >= entry.openingTimeEnd
        ) {
          return reply.code(400).send({
            status: "error",
            error: `Special date ${entry.date} has invalid opening and closing times`,
          });
        }
      }

      const module = await prisma.businessModule.findFirst({
        where: {
          businessId: business.id,
          moduleCode: "ordering",
        },
        select: {
          id: true,
        },
      });

      await prisma.$transaction(async (tx) => {
        if (module) {
          await tx.businessModule.update({
            where: {
              id: module.id,
            },
            data: {
              settingsJson: settings,
              active: true,
            },
          });
        } else {
          await tx.businessModule.create({
            data: {
              businessId: business.id,
              moduleCode: "ordering",
              active: true,
              settingsJson: settings,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorUserId: auth.user.id,
            action: "ordering.settings.updated",
            targetType: "business_module",
            targetId: module?.id ?? null,
            scopeType: "business",
            cityId: business.city.id,
            businessId: business.id,
            metadataJson: settings,
          },
        });
      });

      return reply.send({
        status: "ok",
        settings,
      });
    },
  );

  app.get(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/coupons",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(businessParamsSchema, request.params);
      const queryParsed = parsePayload(couponListQuerySchema, request.query);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
      }

      if (!queryParsed.success) {
        return reply.code(queryParsed.response.statusCode).send(queryParsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        paramsParsed.data.citySlug,
        paramsParsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "settings.manage", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const coupons = await prisma.coupon.findMany({
        where: {
          businessId: business.id,
          active: queryParsed.data.active,
        },
        orderBy: [{ createdAt: "desc" }],
        take: queryParsed.data.limit,
      });

      return reply.send({
        status: "ok",
        items: coupons.map(mapCoupon),
      });
    },
  );

  app.post(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/coupons",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(businessParamsSchema, request.params);
      const bodyParsed = parsePayload(createCouponSchema, request.body);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
      }

      if (!bodyParsed.success) {
        return reply.code(bodyParsed.response.statusCode).send(bodyParsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        paramsParsed.data.citySlug,
        paramsParsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "settings.manage", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      try {
        const coupon = await prisma.$transaction(async (tx) => {
          const createdCoupon = await tx.coupon.create({
            data: {
              businessId: business.id,
              code: bodyParsed.data.code.trim().toUpperCase(),
              type: bodyParsed.data.type,
              value: new Prisma.Decimal(bodyParsed.data.value),
              expiresAt: bodyParsed.data.expiresAt ? new Date(bodyParsed.data.expiresAt) : null,
              usageLimit: bodyParsed.data.usageLimit,
              active: bodyParsed.data.active,
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: auth.user.id,
              action: "ordering.coupon.created",
              targetType: "coupon",
              targetId: createdCoupon.id,
              scopeType: "business",
              cityId: business.city.id,
              businessId: business.id,
              metadataJson: {
                code: createdCoupon.code,
                type: createdCoupon.type,
              },
            },
          });

          return createdCoupon;
        });

        return reply.code(201).send({
          status: "ok",
          item: mapCoupon(coupon),
        });
      } catch (error) {
        if (isPrismaError(error, "P2002")) {
          return reply.code(409).send({
            status: "error",
            error: "Coupon code already exists for this business",
          });
        }

        throw error;
      }
    },
  );

  app.patch(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/coupons/:couponId",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(couponParamsSchema, request.params);
      const bodyParsed = parsePayload(updateCouponSchema, request.body);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
      }

      if (!bodyParsed.success) {
        return reply.code(bodyParsed.response.statusCode).send(bodyParsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        paramsParsed.data.citySlug,
        paramsParsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "settings.manage", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const existingCoupon = await prisma.coupon.findFirst({
        where: {
          id: paramsParsed.data.couponId,
          businessId: business.id,
        },
        select: {
          id: true,
          code: true,
          type: true,
          value: true,
          expiresAt: true,
          usageLimit: true,
          active: true,
        },
      });

      if (!existingCoupon) {
        return reply.code(404).send({
          status: "error",
          error: "Coupon not found",
        });
      }

      try {
        const coupon = await prisma.$transaction(async (tx) => {
          const updatedCoupon = await tx.coupon.update({
            where: {
              id: existingCoupon.id,
            },
            data: {
              code: bodyParsed.data.code?.trim().toUpperCase(),
              type: bodyParsed.data.type,
              value:
                bodyParsed.data.value != null
                  ? new Prisma.Decimal(bodyParsed.data.value)
                  : undefined,
              expiresAt:
                bodyParsed.data.expiresAt === null
                  ? null
                  : bodyParsed.data.expiresAt
                    ? new Date(bodyParsed.data.expiresAt)
                    : undefined,
              usageLimit: bodyParsed.data.usageLimit,
              active: bodyParsed.data.active,
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: auth.user.id,
              action: "ordering.coupon.updated",
              targetType: "coupon",
              targetId: updatedCoupon.id,
              scopeType: "business",
              cityId: business.city.id,
              businessId: business.id,
              metadataJson: {
                from: {
                  code: existingCoupon.code,
                  type: existingCoupon.type,
                  value: decimalToNumber(existingCoupon.value),
                  expiresAt: existingCoupon.expiresAt,
                  usageLimit: existingCoupon.usageLimit,
                  active: existingCoupon.active,
                },
                to: {
                  code: updatedCoupon.code,
                  type: updatedCoupon.type,
                  value: decimalToNumber(updatedCoupon.value),
                  expiresAt: updatedCoupon.expiresAt,
                  usageLimit: updatedCoupon.usageLimit,
                  active: updatedCoupon.active,
                },
              },
            },
          });

          return updatedCoupon;
        });

        return reply.send({
          status: "ok",
          item: mapCoupon(coupon),
        });
      } catch (error) {
        if (isPrismaError(error, "P2002")) {
          return reply.code(409).send({
            status: "error",
            error: "Coupon code already exists for this business",
          });
        }

        throw error;
      }
    },
  );

  app.delete(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/coupons/:couponId",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = parsePayload(couponParamsSchema, request.params);

      if (!parsed.success) {
        return reply.code(parsed.response.statusCode).send(parsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        parsed.data.citySlug,
        parsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "settings.manage", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const coupon = await prisma.coupon.findFirst({
        where: {
          id: parsed.data.couponId,
          businessId: business.id,
        },
        select: {
          id: true,
          code: true,
        },
      });

      if (!coupon) {
        return reply.code(404).send({
          status: "error",
          error: "Coupon not found",
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.order.updateMany({
          where: {
            couponId: coupon.id,
          },
          data: {
            couponId: null,
          },
        });

        await tx.coupon.delete({
          where: {
            id: coupon.id,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: auth.user.id,
            action: "ordering.coupon.deleted",
            targetType: "coupon",
            targetId: coupon.id,
            scopeType: "business",
            cityId: business.city.id,
            businessId: business.id,
            metadataJson: {
              code: coupon.code,
            },
          },
        });
      });

      return reply.send({
        status: "ok",
      });
    },
  );

  app.patch(
    "/api/v2/ordering/businesses/:citySlug/:businessSlug/orders/:orderId/status",
    { preHandler: requireAuth },
    async (request, reply) => {
      const paramsParsed = parsePayload(orderParamsSchema, request.params);
      const bodyParsed = parsePayload(updateOrderStatusSchema, request.body);

      if (!paramsParsed.success) {
        return reply.code(paramsParsed.response.statusCode).send(paramsParsed.response.body);
      }

      if (!bodyParsed.success) {
        return reply.code(bodyParsed.response.statusCode).send(bodyParsed.response.body);
      }

      const auth = getRequestAuth(request);
      const business = await findBusinessForOrdering(
        paramsParsed.data.citySlug,
        paramsParsed.data.businessSlug,
      );

      if (!business) {
        return reply.code(404).send({
          status: "error",
          error: "Business not found",
        });
      }

      if (
        !canAccess(auth.activeAccess, "orders.manage", {
          scopeType: "business",
          cityId: business.city.id,
          businessId: business.id,
        })
      ) {
        return reply.code(403).send({
          status: "error",
          error: "Insufficient permissions",
        });
      }

      const existingOrder = await prisma.order.findFirst({
        where: {
          id: paramsParsed.data.orderId,
          businessId: business.id,
        },
        include: {
          items: true,
        },
      });

      if (!existingOrder) {
        return reply.code(404).send({
          status: "error",
          error: "Order not found",
        });
      }

      const order = await prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({
          where: {
            id: existingOrder.id,
          },
          data: {
            status: bodyParsed.data.status,
            handledByUserId: auth.user.id,
            loyaltyAwarded:
              bodyParsed.data.status === "completed" ? true : existingOrder.loyaltyAwarded,
          },
          include: {
            items: true,
          },
        });

        if (
          bodyParsed.data.status === "completed" &&
          existingOrder.customerProfileId &&
          !existingOrder.loyaltyAwarded
        ) {
          await tx.customerProfile.update({
            where: {
              id: existingOrder.customerProfileId,
            },
            data: {
              points: {
                increment: 1,
              },
              completedOrders: {
                increment: 1,
              },
              lastOrderAt: new Date(),
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorUserId: auth.user.id,
            action: "ordering.order.status_updated",
            targetType: "order",
            targetId: updatedOrder.id,
            scopeType: "business",
            cityId: business.city.id,
            businessId: business.id,
            metadataJson: {
              from: existingOrder.status,
              to: bodyParsed.data.status,
            },
          },
        });

        return updatedOrder;
      });

      return reply.send({
        status: "ok",
        order: mapOrder(order),
      });
    },
  );
}
