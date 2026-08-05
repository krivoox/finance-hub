-- SPEC-18 — Recurring transaction templates + link on Transaction

CREATE TYPE "RecurringFrequency" AS ENUM ('weekly', 'biweekly', 'monthly', 'yearly');
CREATE TYPE "RecurringRuleStatus" AS ENUM ('active', 'paused', 'ended');
CREATE TYPE "RecurringPausedReason" AS ENUM ('manual', 'account_archived');

CREATE TABLE "recurring_rule" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "counterpartyAccountId" TEXT,
    "categoryId" TEXT,
    "description" TEXT,
    "frequency" "RecurringFrequency" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "status" "RecurringRuleStatus" NOT NULL DEFAULT 'active',
    "pausedReason" "RecurringPausedReason",
    "createdByUserId" TEXT NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_rule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recurring_rule_workspaceId_status_idx" ON "recurring_rule"("workspaceId", "status");
CREATE INDEX "recurring_rule_workspaceId_type_idx" ON "recurring_rule"("workspaceId", "type");
CREATE INDEX "recurring_rule_accountId_idx" ON "recurring_rule"("accountId");
CREATE INDEX "recurring_rule_counterpartyAccountId_idx" ON "recurring_rule"("counterpartyAccountId");

ALTER TABLE "recurring_rule" ADD CONSTRAINT "recurring_rule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_rule" ADD CONSTRAINT "recurring_rule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "finance_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recurring_rule" ADD CONSTRAINT "recurring_rule_counterpartyAccountId_fkey" FOREIGN KEY ("counterpartyAccountId") REFERENCES "finance_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recurring_rule" ADD CONSTRAINT "recurring_rule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transaction" ADD COLUMN "recurringRuleId" TEXT;
ALTER TABLE "transaction" ADD COLUMN "scheduledOn" DATE;

CREATE UNIQUE INDEX "transaction_recurringRuleId_scheduledOn_key" ON "transaction"("recurringRuleId", "scheduledOn");
CREATE INDEX "transaction_recurringRuleId_idx" ON "transaction"("recurringRuleId");

ALTER TABLE "transaction" ADD CONSTRAINT "transaction_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "recurring_rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
