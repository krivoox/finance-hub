-- SPEC-08 H4 — Link GoalContribution 1:1 to transfer Transaction.
-- Pre-H4 contributions (counter-only, no transfer) cannot satisfy the new
-- NOT NULL FK; drop them so green environments can migrate cleanly.
DELETE FROM "goal_contribution";

-- AlterTable
ALTER TABLE "goal_contribution" ADD COLUMN "transactionId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "goal_contribution_transactionId_key" ON "goal_contribution"("transactionId");

-- AddForeignKey
ALTER TABLE "goal_contribution" ADD CONSTRAINT "goal_contribution_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
