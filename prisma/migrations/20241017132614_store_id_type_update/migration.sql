-- DropForeignKey
ALTER TABLE "Staff" DROP CONSTRAINT "Staff_storeId_fkey";

-- AlterTable
ALTER TABLE "Staff" ALTER COLUMN "storeId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Store" ALTER COLUMN "storeId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("storeId") ON DELETE CASCADE ON UPDATE CASCADE;
