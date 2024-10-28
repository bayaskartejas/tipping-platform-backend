/*
  Warnings:

  - Added the required column `cover` to the `Store` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "cover" TEXT NOT NULL;
