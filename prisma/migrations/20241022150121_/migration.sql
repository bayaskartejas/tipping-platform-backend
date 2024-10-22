/*
  Warnings:

  - Added the required column `password` to the `Store` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "password" TEXT NOT NULL;
