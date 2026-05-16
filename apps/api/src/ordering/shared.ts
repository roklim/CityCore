import { Prisma } from "@prisma/client";
import { z } from "zod";

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizePhone(value?: string) {
  return value ? value.replace(/\D/g, "") : null;
}

export function parsePayload<T>(schema: z.ZodSchema<T>, payload: unknown) {
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

export function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

export function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  if (!value) {
    return null;
  }

  return Number(value.toString());
}

export function mapMenuItem(item: {
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

export function mapMenuCategory(category: {
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

export function mapOrder(order: {
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

export function mapCoupon(coupon: {
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

export function mapCustomerProfile(customer: {
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
