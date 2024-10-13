-- DropForeignKey
ALTER TABLE "Staff" DROP CONSTRAINT "Staff_storeId_fkey";

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("storeId") ON DELETE CASCADE ON UPDATE CASCADE;
