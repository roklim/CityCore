-- Add the minimal city-scoped event entity used by the thesis prototype.
-- Recurrence, ticketing and booking remain outside the MVP.

CREATE TABLE "city_events" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "organizer_business_id" TEXT,
    "title" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "summary" VARCHAR(280) NOT NULL,
    "description" TEXT,
    "organizer_name" VARCHAR(160) NOT NULL,
    "venue_name" VARCHAR(160) NOT NULL,
    "address_line_1" VARCHAR(200),
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "timezone" VARCHAR(80) NOT NULL DEFAULT 'Europe/Rome',
    "status" "PublicationStatus" NOT NULL DEFAULT 'draft',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "city_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "city_events_valid_interval_check" CHECK (
        "ends_at" IS NULL OR "ends_at" >= "starts_at"
    )
);

CREATE UNIQUE INDEX "city_events_city_id_slug_key" ON "city_events"("city_id", "slug");

CREATE INDEX "city_events_city_status_active_starts_at_idx"
ON "city_events"("city_id", "status", "active", "starts_at");

CREATE INDEX "city_events_organizer_starts_at_idx"
ON "city_events"("organizer_business_id", "starts_at");

ALTER TABLE "city_events"
ADD CONSTRAINT "city_events_city_id_fkey"
FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "city_events"
ADD CONSTRAINT "city_events_organizer_business_id_fkey"
FOREIGN KEY ("organizer_business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
