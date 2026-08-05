-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('new', 'read', 'closed');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "locality" TEXT,
ADD COLUMN     "privacy_contact_email" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "social_links_json" JSONB;

-- CreateTable
CREATE TABLE "business_services" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "short_description" VARCHAR(280),
    "description" TEXT,
    "price_label" VARCHAR(80),
    "duration_minutes" INTEGER,
    "status" "PublicationStatus" NOT NULL DEFAULT 'draft',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_opening_days" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "note" VARCHAR(280),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_opening_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_opening_intervals" (
    "id" TEXT NOT NULL,
    "opening_day_id" TEXT NOT NULL,
    "opens_at" VARCHAR(5) NOT NULL,
    "closes_at" VARCHAR(5) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_opening_intervals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_inquiries" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(60),
    "message" TEXT NOT NULL,
    "privacy_accepted" BOOLEAN NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'new',
    "read_at" TIMESTAMP(3),
    "internal_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_services_business_status_sort_order_idx" ON "business_services"("business_id", "status", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "business_services_business_id_slug_key" ON "business_services"("business_id", "slug");

-- CreateIndex
CREATE INDEX "business_opening_days_business_weekday_idx" ON "business_opening_days"("business_id", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "business_opening_days_business_id_weekday_key" ON "business_opening_days"("business_id", "weekday");

-- CreateIndex
CREATE INDEX "business_opening_intervals_day_sort_order_idx" ON "business_opening_intervals"("opening_day_id", "sort_order");

-- CreateIndex
CREATE INDEX "business_inquiries_business_status_created_at_idx" ON "business_inquiries"("business_id", "status", "created_at");

-- AddForeignKey
ALTER TABLE "business_services" ADD CONSTRAINT "business_services_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_opening_days" ADD CONSTRAINT "business_opening_days_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_opening_intervals" ADD CONSTRAINT "business_opening_intervals_opening_day_id_fkey" FOREIGN KEY ("opening_day_id") REFERENCES "business_opening_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_inquiries" ADD CONSTRAINT "business_inquiries_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
