/*
  Warnings:

  - You are about to drop the column `code` on the `Coupon` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `Coupon` table. All the data in the column will be lost.
  - You are about to drop the column `discount` on the `Coupon` table. All the data in the column will be lost.
  - You are about to drop the column `storeName` on the `Coupon` table. All the data in the column will be lost.
  - You are about to drop the column `validity` on the `Coupon` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[couponCode]` on the table `Coupon` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `applicableItems` to the `Coupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `couponCode` to the `Coupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerRestriction` to the `Coupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `Coupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discountType` to the `Coupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discountValue` to the `Coupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expirationDate` to the `Coupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Coupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalUses` to the `Coupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Coupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `usesPerCustomer` to the `Coupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `visibility` to the `Coupon` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Coupon" DROP CONSTRAINT "Coupon_customerId_fkey";

-- DropIndex
DROP INDEX "Coupon_code_key";

-- AlterTable
ALTER TABLE "Coupon" DROP COLUMN "code",
DROP COLUMN "customerId",
DROP COLUMN "discount",
DROP COLUMN "storeName",
DROP COLUMN "validity",
ADD COLUMN     "applicableItems" TEXT NOT NULL,
ADD COLUMN     "contactInfo" TEXT,
ADD COLUMN     "couponCode" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "customerRestriction" TEXT NOT NULL,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "discountType" TEXT NOT NULL,
ADD COLUMN     "discountValue" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "expirationDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "minimumPurchase" DOUBLE PRECISION,
ADD COLUMN     "specificItems" TEXT,
ADD COLUMN     "termsConditions" TEXT,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "totalUses" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "usesPerCustomer" INTEGER NOT NULL,
ADD COLUMN     "visibility" JSONB NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_couponCode_key" ON "Coupon"("couponCode");
