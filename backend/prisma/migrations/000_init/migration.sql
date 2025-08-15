-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."frequency_enum" AS ENUM ('daily', 'weekly', 'monthly', 'yearly');

-- CreateEnum
CREATE TYPE "public"."weekday_enum" AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- CreateTable
CREATE TABLE "public"."fin_users" (
    "user_id" SERIAL NOT NULL,
    "user_public_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_email" VARCHAR(255) NOT NULL,
    "user_password_hash" VARCHAR(255) NOT NULL,
    "user_name" VARCHAR(100) NOT NULL,
    "user_is_active" BOOLEAN NOT NULL DEFAULT true,
    "user_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "user_email_token" VARCHAR(100),
    "user_email_token_expires_at" TIMESTAMPTZ(6),
    "user_created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_reset_token" TEXT,
    "user_reset_token_expires_at" TIMESTAMPTZ(6),
    "user_token_version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "fin_users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."fin_accounts" (
    "account_id" SERIAL NOT NULL,
    "account_name" VARCHAR(100) NOT NULL,
    "account_type" VARCHAR(50) NOT NULL,
    "account_balance" BIGINT NOT NULL DEFAULT 0,
    "account_description" TEXT,
    "account_is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "account_created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "account_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "account_deleted_at" TIMESTAMPTZ(6),
    "account_user_id" INTEGER NOT NULL,

    CONSTRAINT "fin_accounts_pkey" PRIMARY KEY ("account_id")
);

-- CreateTable
CREATE TABLE "public"."fin_categories" (
    "category_id" SERIAL NOT NULL,
    "category_name" VARCHAR(100) NOT NULL,
    "category_description" TEXT,
    "category_user_id" INTEGER NOT NULL,

    CONSTRAINT "fin_categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "public"."fin_income_sources" (
    "income_source_id" SERIAL NOT NULL,
    "income_source_name" VARCHAR(100) NOT NULL,
    "income_source_description" TEXT,
    "income_source_user_id" INTEGER NOT NULL,

    CONSTRAINT "fin_income_sources_pkey" PRIMARY KEY ("income_source_id")
);

-- CreateTable
CREATE TABLE "public"."fin_recurring_transactions" (
    "recurring_transaction_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recurring_transaction_name" VARCHAR(100) NOT NULL,
    "recurring_transaction_description" TEXT,
    "recurring_transaction_amount" BIGINT NOT NULL,
    "recurring_transaction_is_saving" BOOLEAN NOT NULL DEFAULT false,
    "recurring_transaction_notes" TEXT,
    "recurring_transaction_frequency" "public"."frequency_enum" NOT NULL,
    "recurring_transaction_interval" INTEGER NOT NULL DEFAULT 1,
    "recurring_transaction_start_date" TIMESTAMPTZ(6) NOT NULL,
    "recurring_transaction_end_date" TIMESTAMPTZ(6),
    "recurring_transaction_day_of_week" "public"."weekday_enum",
    "recurring_transaction_day_of_month" INTEGER,
    "recurring_transaction_is_active" BOOLEAN NOT NULL DEFAULT true,
    "recurring_transaction_next_occurrence" TIMESTAMPTZ(6) NOT NULL,
    "recurring_transaction_category_id" INTEGER,
    "recurring_transaction_income_source_id" INTEGER,
    "recurring_transaction_account_id" INTEGER NOT NULL,
    "recurring_transaction_created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recurring_transaction_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_recurring_transactions_pkey" PRIMARY KEY ("recurring_transaction_id")
);

-- CreateTable
CREATE TABLE "public"."fin_transactions" (
    "transaction_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transaction_amount" BIGINT NOT NULL,
    "transaction_description" VARCHAR(255) NOT NULL,
    "transaction_is_saving" BOOLEAN NOT NULL DEFAULT false,
    "transaction_notes" TEXT,
    "transaction_category_id" INTEGER,
    "transaction_account_id" INTEGER NOT NULL,
    "transaction_income_source_id" INTEGER,
    "transaction_recurring_transaction_id" UUID,
    "transaction_created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transaction_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fin_users_user_public_id_key" ON "public"."fin_users"("user_public_id");

-- CreateIndex
CREATE UNIQUE INDEX "fin_users_user_email_key" ON "public"."fin_users"("user_email");

-- CreateIndex
CREATE UNIQUE INDEX "fin_categories_category_user_id_category_name_key" ON "public"."fin_categories"("category_user_id", "category_name");

-- CreateIndex
CREATE UNIQUE INDEX "fin_income_sources_income_source_user_id_income_source_name_key" ON "public"."fin_income_sources"("income_source_user_id", "income_source_name");

-- AddForeignKey
ALTER TABLE "public"."fin_accounts" ADD CONSTRAINT "fin_accounts_account_user_id_fkey" FOREIGN KEY ("account_user_id") REFERENCES "public"."fin_users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fin_categories" ADD CONSTRAINT "fin_categories_category_user_id_fkey" FOREIGN KEY ("category_user_id") REFERENCES "public"."fin_users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fin_income_sources" ADD CONSTRAINT "fin_income_sources_income_source_user_id_fkey" FOREIGN KEY ("income_source_user_id") REFERENCES "public"."fin_users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fin_recurring_transactions" ADD CONSTRAINT "fin_recurring_transactions_recurring_transaction_account_i_fkey" FOREIGN KEY ("recurring_transaction_account_id") REFERENCES "public"."fin_accounts"("account_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fin_recurring_transactions" ADD CONSTRAINT "fin_recurring_transactions_recurring_transaction_category__fkey" FOREIGN KEY ("recurring_transaction_category_id") REFERENCES "public"."fin_categories"("category_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fin_recurring_transactions" ADD CONSTRAINT "fin_recurring_transactions_recurring_transaction_income_so_fkey" FOREIGN KEY ("recurring_transaction_income_source_id") REFERENCES "public"."fin_income_sources"("income_source_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fin_transactions" ADD CONSTRAINT "fin_transactions_transaction_account_id_fkey" FOREIGN KEY ("transaction_account_id") REFERENCES "public"."fin_accounts"("account_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fin_transactions" ADD CONSTRAINT "fin_transactions_transaction_category_id_fkey" FOREIGN KEY ("transaction_category_id") REFERENCES "public"."fin_categories"("category_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fin_transactions" ADD CONSTRAINT "fin_transactions_transaction_income_source_id_fkey" FOREIGN KEY ("transaction_income_source_id") REFERENCES "public"."fin_income_sources"("income_source_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fin_transactions" ADD CONSTRAINT "fin_transactions_transaction_recurring_transaction_id_fkey" FOREIGN KEY ("transaction_recurring_transaction_id") REFERENCES "public"."fin_recurring_transactions"("recurring_transaction_id") ON DELETE SET NULL ON UPDATE NO ACTION;

