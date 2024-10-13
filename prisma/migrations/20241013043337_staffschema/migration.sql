/*
  Warnings:

  - A unique constraint covering the columns `[number]` on the table `Staff` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `number` to the `Staff` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "number" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Staff_number_key" ON "Staff"("number");
