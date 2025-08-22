/*
  Warnings:

  - You are about to drop the `TransactionRule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."TransactionRule" DROP CONSTRAINT "TransactionRule_userId_fkey";

-- DropTable
DROP TABLE "public"."TransactionRule";

-- CreateTable
CREATE TABLE "public"."fin_transaction_rules" (
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

    CONSTRAINT "fin_transaction_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fin_transaction_rules_userId_isActive_priority_idx" ON "public"."fin_transaction_rules"("userId", "isActive", "priority");

-- AddForeignKey
ALTER TABLE "public"."fin_transaction_rules" ADD CONSTRAINT "fin_transaction_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."fin_users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
