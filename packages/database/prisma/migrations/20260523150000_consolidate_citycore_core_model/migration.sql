-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('draft', 'in_review', 'published', 'archived');

-- CreateEnum
CREATE TYPE "MediaAssetKind" AS ENUM ('image', 'video', 'document', 'external');

-- CreateEnum
CREATE TYPE "CollectionType" AS ENUM ('featured', 'editorial', 'neighborhood', 'seasonal', 'promotion');

-- CreateEnum
CREATE TYPE "CollectionItemType" AS ENUM ('business', 'category', 'page', 'external');

-- AlterTable
ALTER TABLE "cities"
ADD COLUMN "summary" TEXT,
ADD COLUMN "primary_color" TEXT,
ADD COLUMN "accent_color" TEXT,
ADD COLUMN "tone_of_voice" TEXT,
ADD COLUMN "settings_json" JSONB,
ADD COLUMN "published_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "businesses"
ADD COLUMN "custom_domain" TEXT,
ADD COLUMN "domain_verified_at" TIMESTAMP(3),
ADD COLUMN "settings_json" JSONB,
ADD COLUMN "published_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "business_modules"
ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "business_pages"
ADD COLUMN "status" "PublicationStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN "published_at" TIMESTAMP(3),
ADD COLUMN "published_by_user_id" TEXT,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "business_sections"
ADD COLUMN "status" "PublicationStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN "published_at" TIMESTAMP(3),
ADD COLUMN "published_by_user_id" TEXT,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "kind" "MediaAssetKind" NOT NULL DEFAULT 'image',
    "scope_type" "ScopeType" NOT NULL,
    "city_id" TEXT,
    "business_id" TEXT,
    "uploaded_by_user_id" TEXT,
    "storage_provider" TEXT NOT NULL DEFAULT 'external',
    "bucket" TEXT,
    "object_key" TEXT,
    "public_url" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "alt_text" TEXT,
    "caption" TEXT,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_modules" (
    "id" TEXT NOT NULL,
    "code" "ModuleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "public_enabled" BOOLEAN NOT NULL DEFAULT true,
    "admin_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "settings_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city_categories" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "slug" VARCHAR(160) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "module_code" "ModuleCode",
    "icon" TEXT,
    "color" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "settings_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "city_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_category_assignments" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_category_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city_collections" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "type" "CollectionType" NOT NULL DEFAULT 'featured',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "cover_asset_id" TEXT,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "settings_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "city_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city_collection_items" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "item_type" "CollectionItemType" NOT NULL,
    "business_id" TEXT,
    "category_id" TEXT,
    "page_id" TEXT,
    "title" VARCHAR(160),
    "subtitle" TEXT,
    "href" TEXT,
    "image_asset_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "city_collection_items_pkey" PRIMARY KEY ("id")
);

-- Normalize legacy free-form asset pointers before adding foreign keys.
UPDATE "cities"
SET "featured_image_asset_id" = NULL
WHERE "featured_image_asset_id" IS NOT NULL;

UPDATE "businesses"
SET "logo_asset_id" = NULL
WHERE "logo_asset_id" IS NOT NULL;

UPDATE "businesses"
SET "cover_asset_id" = NULL
WHERE "cover_asset_id" IS NOT NULL;

-- CreateIndex
CREATE INDEX "cities_published_at_idx" ON "cities"("published_at");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_custom_domain_key" ON "businesses"("custom_domain");

-- CreateIndex
CREATE INDEX "businesses_published_at_idx" ON "businesses"("published_at");

-- CreateIndex
CREATE INDEX "media_assets_scope_city_business_idx" ON "media_assets"("scope_type", "city_id", "business_id");

-- CreateIndex
CREATE INDEX "media_assets_city_kind_idx" ON "media_assets"("city_id", "kind");

-- CreateIndex
CREATE INDEX "media_assets_business_kind_idx" ON "media_assets"("business_id", "kind");

-- CreateIndex
CREATE INDEX "media_assets_uploaded_by_user_id_idx" ON "media_assets"("uploaded_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_modules_code_key" ON "platform_modules"("code");

-- CreateIndex
CREATE INDEX "platform_modules_active_sort_order_idx" ON "platform_modules"("active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "city_categories_city_id_slug_key" ON "city_categories"("city_id", "slug");

-- CreateIndex
CREATE INDEX "city_categories_city_active_sort_order_idx" ON "city_categories"("city_id", "active", "sort_order");

-- CreateIndex
CREATE INDEX "city_categories_parent_id_idx" ON "city_categories"("parent_id");

-- CreateIndex
CREATE INDEX "city_categories_module_active_idx" ON "city_categories"("module_code", "active");

-- CreateIndex
CREATE UNIQUE INDEX "business_category_assignments_business_category_key" ON "business_category_assignments"("business_id", "category_id");

-- CreateIndex
CREATE INDEX "business_category_assignments_category_primary_idx" ON "business_category_assignments"("category_id", "primary");

-- CreateIndex
CREATE INDEX "business_category_assignments_business_primary_idx" ON "business_category_assignments"("business_id", "primary");

-- CreateIndex
CREATE INDEX "business_pages_business_status_active_idx" ON "business_pages"("business_id", "status", "active");

-- CreateIndex
CREATE INDEX "business_pages_published_by_user_id_idx" ON "business_pages"("published_by_user_id");

-- CreateIndex
CREATE INDEX "business_sections_page_status_active_idx" ON "business_sections"("page_id", "status", "active");

-- CreateIndex
CREATE INDEX "business_sections_published_by_user_id_idx" ON "business_sections"("published_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "city_collections_city_id_slug_key" ON "city_collections"("city_id", "slug");

-- CreateIndex
CREATE INDEX "city_collections_city_type_active_sort_order_idx" ON "city_collections"("city_id", "type", "active", "sort_order");

-- CreateIndex
CREATE INDEX "city_collections_cover_asset_id_idx" ON "city_collections"("cover_asset_id");

-- CreateIndex
CREATE INDEX "city_collection_items_collection_active_sort_order_idx" ON "city_collection_items"("collection_id", "active", "sort_order");

-- CreateIndex
CREATE INDEX "city_collection_items_business_id_idx" ON "city_collection_items"("business_id");

-- CreateIndex
CREATE INDEX "city_collection_items_category_id_idx" ON "city_collection_items"("category_id");

-- CreateIndex
CREATE INDEX "city_collection_items_page_id_idx" ON "city_collection_items"("page_id");

-- CreateIndex
CREATE INDEX "city_collection_items_image_asset_id_idx" ON "city_collection_items"("image_asset_id");

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_featured_image_asset_id_fkey" FOREIGN KEY ("featured_image_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_categories" ADD CONSTRAINT "city_categories_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_categories" ADD CONSTRAINT "city_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "city_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_logo_asset_id_fkey" FOREIGN KEY ("logo_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_category_assignments" ADD CONSTRAINT "business_category_assignments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_category_assignments" ADD CONSTRAINT "business_category_assignments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "city_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_pages" ADD CONSTRAINT "business_pages_published_by_user_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_sections" ADD CONSTRAINT "business_sections_published_by_user_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_collections" ADD CONSTRAINT "city_collections_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_collections" ADD CONSTRAINT "city_collections_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_collection_items" ADD CONSTRAINT "city_collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "city_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_collection_items" ADD CONSTRAINT "city_collection_items_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_collection_items" ADD CONSTRAINT "city_collection_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "city_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_collection_items" ADD CONSTRAINT "city_collection_items_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "business_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_collection_items" ADD CONSTRAINT "city_collection_items_image_asset_id_fkey" FOREIGN KEY ("image_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
