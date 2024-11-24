-- DropIndex
DROP INDEX "Transaction_hash_key";

-- CreateTable
CREATE TABLE "Metrics" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "totalVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Metrics_pkey" PRIMARY KEY ("id")
);
