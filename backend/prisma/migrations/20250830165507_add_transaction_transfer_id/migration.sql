-- AlterTable
ALTER TABLE "public"."fin_transactions" ADD COLUMN     "transaction_transfer_id" UUID;

-- CreateIndex
CREATE INDEX "fin_transactions_transaction_transfer_id_idx" ON "public"."fin_transactions"("transaction_transfer_id");
