import { Prisma } from "@prisma/client";
import { prisma } from "../database.js";
import { type CreateOrderPayload } from "./config.js";
import { getOrderingSettings, resolvePickupSelection } from "./availability.js";
import { type OrderingBusiness } from "./business.js";
import { normalizePhone } from "./shared.js";

type CreatePublicOrderResult =
  | {
      ok: true;
      order: Prisma.OrderGetPayload<{
        include: {
          items: true;
        };
      }>;
      trackingPath: string;
    }
  | {
      ok: false;
      statusCode: number;
      error: string;
    };

export async function createPublicOrder({
  business,
  payload,
}: {
  business: OrderingBusiness;
  payload: CreateOrderPayload;
}): Promise<CreatePublicOrderResult> {
  const orderingSettings = getOrderingSettings(business);
  const pickupSelection = await resolvePickupSelection(business, payload);

  if ("error" in pickupSelection) {
    return {
      ok: false,
      statusCode: 400,
      error: pickupSelection.error ?? "Invalid pickup selection",
    };
  }

  const menuItemIds = payload.items.map((item) => item.menuItemId);
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
    return {
      ok: false,
      statusCode: 400,
      error: "One or more menu items are not available",
    };
  }

  const menuItemById = new Map(menuItems.map((item) => [item.id, item]));
  const normalizedPhone = normalizePhone(payload.customerPhone);
  const normalizedCouponCode = payload.couponCode?.trim().toUpperCase() ?? null;
  const itemsPreview = payload.items.map((item) => {
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
    return {
      ok: false,
      statusCode: 400,
      error: `Minimum order is ${orderingSettings.minimumOrder.toFixed(2)} EUR`,
    };
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
              name: payload.customerName,
              email: payload.customerEmail ?? null,
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
              name: payload.customerName,
              phone: normalizedPhone,
              email: payload.customerEmail ?? null,
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
          customerName: payload.customerName,
          customerPhone: normalizedPhone,
          customerEmail: payload.customerEmail ?? null,
          status: "pending",
          fulfillmentType: "pickup",
          pickupAt: pickupSelection.pickupAt,
          notes: payload.notes ?? null,
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

    return {
      ok: true,
      order,
      trackingPath: `/${business.city.slug}/${business.slug}/ordine/${order.id}`,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "COUPON_NOT_FOUND") {
      return {
        ok: false,
        statusCode: 404,
        error: "Coupon not found",
      };
    }

    if (error instanceof Error && error.message === "COUPON_EXPIRED") {
      return {
        ok: false,
        statusCode: 400,
        error: "Coupon expired",
      };
    }

    if (error instanceof Error && error.message === "COUPON_USAGE_LIMIT_REACHED") {
      return {
        ok: false,
        statusCode: 409,
        error: "Coupon usage limit reached",
      };
    }

    throw error;
  }
}
