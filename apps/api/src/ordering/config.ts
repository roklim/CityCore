import { z } from "zod";

const optionalTrimmedString = z.string().trim().min(1);

export const orderStatuses = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^\d{2}:\d{2}$/;
export const PICKUP_TIME_ZONE = process.env.PICKUP_TIME_ZONE?.trim() || "Europe/Rome";
export const DEFAULT_SLOT_MINUTES = 15;
export const DEFAULT_MAX_ORDERS_PER_SLOT = 4;
export const DEFAULT_MIN_PREPARATION_MINUTES = 30;
export const DEFAULT_PICKUP_START_TIME = "18:00";
export const DEFAULT_PICKUP_END_TIME = "22:30";
export const DEFAULT_CLOSED_WEEKDAYS = [1];

export const businessParamsSchema = z.object({
  citySlug: optionalTrimmedString.max(120),
  businessSlug: optionalTrimmedString.max(160),
});

export const createMenuCategorySchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: optionalTrimmedString.max(160).optional(),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  active: z.boolean().default(true),
});

export const createMenuItemSchema = z.object({
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

export const updateMenuItemSchema = z.object({
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

export const createOrderSchema = z.object({
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

export type CreateOrderPayload = z.infer<typeof createOrderSchema>;

export const listOrdersQuerySchema = z.object({
  status: z.enum(orderStatuses).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const orderParamsSchema = z.object({
  citySlug: optionalTrimmedString.max(120),
  businessSlug: optionalTrimmedString.max(160),
  orderId: z.string().trim().min(1).max(100),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatuses),
});

export const customerLookupQuerySchema = z.object({
  phone: optionalTrimmedString.max(40).optional(),
  q: optionalTrimmedString.max(160).optional(),
  limit: z.coerce.number().int().positive().max(100).default(30),
});

export const availabilityQuerySchema = z.object({
  date: z.string().regex(DATE_RE),
});

export const orderingSpecialDateSchema = z.object({
  date: z.string().regex(DATE_RE),
  closed: z.boolean().optional(),
  openingTimeStart: z.string().regex(TIME_RE).optional(),
  openingTimeEnd: z.string().regex(TIME_RE).optional(),
  slotMinutes: z.number().int().min(5).max(180).optional(),
  maxOrdersPerSlot: z.number().int().min(1).max(500).optional(),
  minPreparationMinutes: z.number().int().min(0).max(720).optional(),
});

export const orderingSettingsSchema = z.object({
  openingHours: optionalTrimmedString.max(120).optional(),
  openingDays: z
    .array(z.enum(["lun", "mar", "mer", "gio", "ven", "sab", "dom"]))
    .max(7)
    .optional(),
  openingTimeStart: z.string().regex(TIME_RE).optional(),
  openingTimeEnd: z.string().regex(TIME_RE).optional(),
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

export const createCouponSchema = z.object({
  code: z.string().trim().min(2).max(80),
  type: z.enum(["percent", "fixed"]),
  value: z.number().positive().max(10_000),
  expiresAt: z.string().datetime({ offset: true }).optional(),
  usageLimit: z.number().int().min(0).max(1_000_000).default(0),
  active: z.boolean().default(true),
});

export const updateCouponSchema = z.object({
  code: z.string().trim().min(2).max(80).optional(),
  type: z.enum(["percent", "fixed"]).optional(),
  value: z.number().positive().max(10_000).optional(),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  usageLimit: z.number().int().min(0).max(1_000_000).optional(),
  active: z.boolean().optional(),
});

export const couponParamsSchema = z.object({
  citySlug: optionalTrimmedString.max(120),
  businessSlug: optionalTrimmedString.max(160),
  couponId: z.string().trim().min(1).max(100),
});

export const menuItemParamsSchema = z.object({
  citySlug: optionalTrimmedString.max(120),
  businessSlug: optionalTrimmedString.max(160),
  itemId: z.string().trim().min(1).max(100),
});

export const couponListQuerySchema = z.object({
  active: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});
