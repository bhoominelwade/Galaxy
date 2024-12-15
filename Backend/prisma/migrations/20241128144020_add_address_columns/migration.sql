/*
  Warnings:

  - You are about to drop the `Metrics` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[hash]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fromAddress` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `toAddress` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "fromAddress" TEXT NOT NULL,
ADD COLUMN     "toAddress" TEXT NOT NULL;

-- DropTable
DROP TABLE "Metrics";

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_hash_key" ON "Transaction"("hash");

-- CreateIndex
CREATE INDEX "Transaction_fromAddress_idx" ON "Transaction"("fromAddress");

-- CreateIndex
CREATE INDEX "Transaction_toAddress_idx" ON "Transaction"("toAddress");
