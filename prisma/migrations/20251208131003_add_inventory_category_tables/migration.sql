-- AlterTable
ALTER TABLE "public"."InventoryCategory" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."InventoryItem" ALTER COLUMN "updatedAt" DROP DEFAULT;
