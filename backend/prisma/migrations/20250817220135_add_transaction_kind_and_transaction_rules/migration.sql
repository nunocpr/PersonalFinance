/*
  Warnings:

  - You are about to drop the column `transaction_recurring_transaction_id` on the `fin_transactions` table. All the data in the column will be lost.
  - You are about to drop the `fin_recurring_transactions` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."TransactionKind" AS ENUM ('DEBIT', 'CREDIT');

-- DropForeignKey
ALTER TABLE "public"."fin_recurring_transactions" DROP CONSTRAINT "fin_recurring_transactions_recurring_transaction_account_i_fkey";

-- DropForeignKey
ALTER TABLE "public"."fin_recurring_transactions" DROP CONSTRAINT "fin_recurring_transactions_recurring_transaction_category__fkey";

-- DropForeignKey
ALTER TABLE "public"."fin_recurring_transactions" DROP CONSTRAINT "fin_recurring_transactions_recurring_transaction_income_so_fkey";

-- DropForeignKey
ALTER TABLE "public"."fin_transactions" DROP CONSTRAINT "fin_transactions_transaction_recurring_transaction_id_fkey";

-- AlterTable
ALTER TABLE "public"."fin_transactions" DROP COLUMN "transaction_recurring_transaction_id",
ADD COLUMN     "kind" "public"."TransactionKind" NOT NULL DEFAULT 'DEBIT';

-- DropTable
DROP TABLE "public"."fin_recurring_transactions";

-- CreateTable
CREATE TABLE "public"."TransactionRule" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "isRegex" BOOLEAN NOT NULL DEFAULT false,
    "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" INTEGER,
    "kind" "public"."TransactionKind",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransactionRule_userId_isActive_priority_idx" ON "public"."TransactionRule"("userId", "isActive", "priority");

-- AddForeignKey
ALTER TABLE "public"."TransactionRule" ADD CONSTRAINT "TransactionRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."fin_users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
