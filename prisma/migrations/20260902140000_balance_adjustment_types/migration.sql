-- AlterEnum
-- SPEC-22 / KRI-36 — ledger types for explicit balance adjustments.
-- With PostgreSQL versions 11 and earlier, adding more than one value
-- in a single migration is not possible.

ALTER TYPE "TransactionType" ADD VALUE 'adjustment_credit';
ALTER TYPE "TransactionType" ADD VALUE 'adjustment_debit';
