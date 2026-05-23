-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('invited', 'active', 'disabled');

-- CreateEnum
CREATE TYPE "AccessRole" AS ENUM ('global_admin', 'city_admin', 'local_admin', 'staff');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('platform', 'city', 'business');

-- CreateEnum
CREATE TYPE "CityStatus" AS ENUM ('active', 'coming_soon', 'disabled');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('commerce', 'service', 'hospitality', 'editorial', 'custom');

-- CreateEnum
CREATE TYPE "ModuleCode" AS ENUM ('content', 'catalog', 'forms_inbox', 'booking', 'hospitality', 'listings', 'directory', 'events');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('draft', 'active', 'paused', 'disabled');

-- CreateEnum
CREATE TYPE "BusinessPlan" AS ENUM ('free', 'pro', 'premium', 'enterprise');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'invited',
    "email_verified_at" TIMESTAMP(3),
    "phone_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "auth_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_grants" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "AccessRole" NOT NULL,
    "scope_type" "ScopeType" NOT NULL,
    "city_id" TEXT,
    "business_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city_registry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "province_code" TEXT,
    "province_name" TEXT,
    "region_code" TEXT,
    "region_name" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IT',
    "istat_code" TEXT,
    "cadastral_code" TEXT,
    "source" TEXT,
    "source_version" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "active_municipality" BOOLEAN NOT NULL DEFAULT true,
    "search_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "city_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "registry_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "province" TEXT,
    "region" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IT',
    "status" "CityStatus" NOT NULL DEFAULT 'coming_soon',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "hero_title" TEXT,
    "hero_description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "featured_image_asset_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL,
    "primary_module" "ModuleCode" NOT NULL,
    "field_schema_json" JSONB,
    "section_schema_json" JSONB,
    "default_cta_label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legal_name" TEXT,
    "category" "TemplateCategory",
    "status" "BusinessStatus" NOT NULL DEFAULT 'draft',
    "plan" "BusinessPlan" NOT NULL DEFAULT 'free',
    "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
    "public_email" TEXT,
    "public_phone" TEXT,
    "website" TEXT,
    "address_line_1" TEXT,
    "address_line_2" TEXT,
    "postal_code" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Rome',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "locale" TEXT NOT NULL DEFAULT 'it-IT',
    "owner_user_id" TEXT,
    "primary_color" TEXT,
    "accent_color" TEXT,
    "logo_asset_id" TEXT,
    "cover_asset_id" TEXT,
    "public_title" TEXT,
    "public_subtitle" TEXT,
    "public_description" TEXT,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "booking_policy" TEXT,
    "cancellation_policy" TEXT,
    "notes_internal" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_modules" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "module_code" "ModuleCode" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "settings_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_pages" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "page_type" VARCHAR(80) NOT NULL DEFAULT 'standard',
    "is_homepage" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "settings_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_sections" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "title" VARCHAR(160),
    "body" TEXT,
    "data_json" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "scope_type" "ScopeType" NOT NULL,
    "city_id" TEXT,
    "business_id" TEXT,
    "metadata_json" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "access_grants_user_id_idx" ON "access_grants"("user_id");

-- CreateIndex
CREATE INDEX "access_grants_city_id_idx" ON "access_grants"("city_id");

-- CreateIndex
CREATE INDEX "access_grants_business_id_idx" ON "access_grants"("business_id");

-- CreateIndex
CREATE INDEX "access_grants_role_scope_type_idx" ON "access_grants"("role", "scope_type");

-- CreateIndex
CREATE UNIQUE INDEX "city_registry_slug_key" ON "city_registry"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "city_registry_istat_code_key" ON "city_registry"("istat_code");

-- CreateIndex
CREATE UNIQUE INDEX "city_registry_cadastral_code_key" ON "city_registry"("cadastral_code");

-- CreateIndex
CREATE INDEX "city_registry_name_idx" ON "city_registry"("name");

-- CreateIndex
CREATE INDEX "city_registry_province_code_idx" ON "city_registry"("province_code");

-- CreateIndex
CREATE INDEX "city_registry_region_code_idx" ON "city_registry"("region_code");

-- CreateIndex
CREATE UNIQUE INDEX "cities_slug_key" ON "cities"("slug");

-- CreateIndex
CREATE INDEX "cities_status_active_idx" ON "cities"("status", "active");

-- CreateIndex
CREATE INDEX "cities_sort_order_idx" ON "cities"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "business_templates_code_key" ON "business_templates"("code");

-- CreateIndex
CREATE INDEX "business_templates_category_active_idx" ON "business_templates"("category", "active");

-- CreateIndex
CREATE INDEX "businesses_city_id_status_idx" ON "businesses"("city_id", "status");

-- CreateIndex
CREATE INDEX "businesses_template_id_idx" ON "businesses"("template_id");

-- CreateIndex
CREATE INDEX "businesses_owner_user_id_idx" ON "businesses"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_city_id_slug_key" ON "businesses"("city_id", "slug");

-- CreateIndex
CREATE INDEX "business_modules_module_code_active_idx" ON "business_modules"("module_code", "active");

-- CreateIndex
CREATE UNIQUE INDEX "business_modules_business_id_module_code_key" ON "business_modules"("business_id", "module_code");

-- CreateIndex
CREATE INDEX "business_pages_business_id_sort_order_idx" ON "business_pages"("business_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "business_pages_business_id_slug_key" ON "business_pages"("business_id", "slug");

-- CreateIndex
CREATE INDEX "business_sections_page_id_sort_order_idx" ON "business_sections"("page_id", "sort_order");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_scope_city_business_idx" ON "audit_logs"("scope_type", "city_id", "business_id");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- AddForeignKey
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_registry_id_fkey" FOREIGN KEY ("registry_id") REFERENCES "city_registry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "business_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_modules" ADD CONSTRAINT "business_modules_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_pages" ADD CONSTRAINT "business_pages_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_sections" ADD CONSTRAINT "business_sections_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "business_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
