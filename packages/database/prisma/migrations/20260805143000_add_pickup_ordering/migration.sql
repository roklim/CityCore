-- Reintroduce a generic pickup-ordering capability without public order tracking.
CREATE TYPE "PickupOrderStatus" AS ENUM ('new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled');

ALTER TABLE "business_services" ADD COLUMN "price_cents" INTEGER;

CREATE TABLE "business_ordering_settings" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "pickup_lead_minutes" INTEGER NOT NULL DEFAULT 30,
    "slot_minutes" INTEGER NOT NULL DEFAULT 15,
    "slot_capacity" INTEGER NOT NULL DEFAULT 4,
    "minimum_order_cents" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_ordering_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_ordering_settings_business_id_key" ON "business_ordering_settings"("business_id");

CREATE TABLE "pickup_orders" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "reference" VARCHAR(32) NOT NULL,
    "customer_name" VARCHAR(120) NOT NULL,
    "customer_email" VARCHAR(200) NOT NULL,
    "customer_phone" VARCHAR(60),
    "notes" TEXT,
    "pickup_at" TIMESTAMP(3) NOT NULL,
    "status" "PickupOrderStatus" NOT NULL DEFAULT 'new',
    "total_cents" INTEGER NOT NULL,
    "privacy_accepted" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pickup_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pickup_orders_reference_key" ON "pickup_orders"("reference");
CREATE INDEX "pickup_orders_business_pickup_status_idx" ON "pickup_orders"("business_id", "pickup_at", "status");
CREATE INDEX "pickup_orders_business_created_at_idx" ON "pickup_orders"("business_id", "created_at");

CREATE TABLE "pickup_order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "service_id" TEXT,
    "name_snapshot" VARCHAR(160) NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total_cents" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pickup_order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pickup_order_items_order_id_idx" ON "pickup_order_items"("order_id");
CREATE INDEX "pickup_order_items_service_id_idx" ON "pickup_order_items"("service_id");

ALTER TABLE "business_ordering_settings"
  ADD CONSTRAINT "business_ordering_settings_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pickup_orders"
  ADD CONSTRAINT "pickup_orders_business_id_fkey"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pickup_order_items"
  ADD CONSTRAINT "pickup_order_items_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "pickup_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pickup_order_items"
  ADD CONSTRAINT "pickup_order_items_service_id_fkey"
  FOREIGN KEY ("service_id") REFERENCES "business_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
