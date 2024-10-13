/*
  Warnings:

  - Added the required column `otp` to the `Store` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "otp" TEXT NOT NULL,
ADD COLUMN     "otpExpires" TIMESTAMP(3);
