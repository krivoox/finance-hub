-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'fx_debit';
ALTER TYPE "TransactionType" ADD VALUE 'fx_credit';

-- CreateTable
CREATE TABLE "currency_exchange" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "fromAmountCents" INTEGER NOT NULL,
    "toAmountCents" INTEGER NOT NULL,
    "occurredOn" DATE NOT NULL,
    "description" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "fromTransactionId" TEXT NOT NULL,
    "toTransactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currency_exchange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_consolidation_rate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rateScaled" INTEGER NOT NULL,
    "scale" INTEGER NOT NULL DEFAULT 1000000,
    "label" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_consolidation_rate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currency_exchange_fromTransactionId_key" ON "currency_exchange"("fromTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "currency_exchange_toTransactionId_key" ON "currency_exchange"("toTransactionId");

-- CreateIndex
CREATE INDEX "currency_exchange_workspaceId_occurredOn_idx" ON "currency_exchange"("workspaceId", "occurredOn");

-- CreateIndex
CREATE INDEX "currency_exchange_fromAccountId_idx" ON "currency_exchange"("fromAccountId");

-- CreateIndex
CREATE INDEX "currency_exchange_toAccountId_idx" ON "currency_exchange"("toAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_consolidation_rate_workspaceId_key" ON "workspace_consolidation_rate"("workspaceId");

-- AddForeignKey
ALTER TABLE "currency_exchange" ADD CONSTRAINT "currency_exchange_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_exchange" ADD CONSTRAINT "currency_exchange_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "finance_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_exchange" ADD CONSTRAINT "currency_exchange_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "finance_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_exchange" ADD CONSTRAINT "currency_exchange_fromTransactionId_fkey" FOREIGN KEY ("fromTransactionId") REFERENCES "transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_exchange" ADD CONSTRAINT "currency_exchange_toTransactionId_fkey" FOREIGN KEY ("toTransactionId") REFERENCES "transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_consolidation_rate" ADD CONSTRAINT "workspace_consolidation_rate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
