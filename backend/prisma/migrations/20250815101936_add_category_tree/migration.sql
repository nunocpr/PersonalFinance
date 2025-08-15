-- DropForeignKey
ALTER TABLE "public"."fin_categories" DROP CONSTRAINT "fin_categories_parent_fk";

-- DropIndex
DROP INDEX "public"."fin_categories_category_user_id_category_name_key";

-- AlterTable
ALTER TABLE "public"."fin_categories" ALTER COLUMN "category_icon" SET DATA TYPE TEXT,
ALTER COLUMN "category_color" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "public"."fin_categories" ADD CONSTRAINT "fin_categories_category_parent_id_fkey" FOREIGN KEY ("category_parent_id") REFERENCES "public"."fin_categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "public"."idx_fin_categories_user_parent" RENAME TO "fin_categories_category_user_id_category_parent_id_category_idx";
