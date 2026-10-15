-- SPEC-23 — Core transaction form: ad-hoc group split + daily recurrence.

-- AlterEnum
-- SPEC-23: the core frequency selector exposes a "Diario" cadence.
ALTER TYPE "RecurringFrequency" ADD VALUE 'daily';

-- CreateEnum
-- SPEC-23: ad-hoc group split methods (free-text members, no SplitGroup).
CREATE TYPE "GroupSplitMode" AS ENUM ('equal', 'custom');

-- CreateTable
CREATE TABLE "transaction_group_split" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "method" "GroupSplitMode" NOT NULL,
    "userShareCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_group_split_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_group_split_member" (
    "id" TEXT NOT NULL,
    "groupSplitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "transaction_group_split_member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_group_split_transactionId_key" ON "transaction_group_split"("transactionId");

-- CreateIndex
CREATE INDEX "transaction_group_split_member_groupSplitId_idx" ON "transaction_group_split_member"("groupSplitId");

-- AddForeignKey
ALTER TABLE "transaction_group_split" ADD CONSTRAINT "transaction_group_split_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_group_split_member" ADD CONSTRAINT "transaction_group_split_member_groupSplitId_fkey" FOREIGN KEY ("groupSplitId") REFERENCES "transaction_group_split"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS deny-all lockdown for new public tables (KRI-18 / security-audit §1).
SELECT public.apply_rls_lockdown_to_public_tables();
