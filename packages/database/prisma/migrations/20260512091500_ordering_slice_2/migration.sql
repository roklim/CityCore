CREATE TYPE "CouponType" AS ENUM ('percent', 'fixed');

CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "usage_limit" INTEGER NOT NULL DEFAULT 0,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "orders"
ADD COLUMN "coupon_id" TEXT,
ADD COLUMN "coupon_code" VARCHAR(80);

CREATE UNIQUE INDEX "coupons_business_id_code_key" ON "coupons"("business_id", "code");
CREATE INDEX "coupons_business_id_active_idx" ON "coupons"("business_id", "active");
CREATE INDEX "orders_coupon_id_idx" ON "orders"("coupon_id");

ALTER TABLE "coupons"
ADD CONSTRAINT "coupons_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders"
ADD CONSTRAINT "orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
