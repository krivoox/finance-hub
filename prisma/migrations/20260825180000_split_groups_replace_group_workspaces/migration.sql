-- KRI-29: SplitGroups replace group workspaces (breaking).
-- Drops tenant-group data, SPEC-14 twins, tenant invitations, and
-- rebuilds expense splits around SplitGroup + memberId.

-- ---------------------------------------------------------------------------
-- 1. Identify group tenants and wipe their graph (Restrict FKs).
-- ---------------------------------------------------------------------------

DELETE FROM "cross_workspace_link";

DELETE FROM "expense_split_share";
DELETE FROM "expense_split";
DELETE FROM "settlement";

DELETE FROM "currency_exchange"
WHERE "workspaceId" IN (SELECT id FROM "workspace" WHERE type = 'group')
   OR "fromAccountId" IN (
        SELECT fa.id FROM "finance_account" fa
        JOIN "workspace" w ON w.id = fa."workspaceId"
        WHERE w.type = 'group'
      )
   OR "toAccountId" IN (
        SELECT fa.id FROM "finance_account" fa
        JOIN "workspace" w ON w.id = fa."workspaceId"
        WHERE w.type = 'group'
      );

DELETE FROM "goal_contribution"
WHERE "goalId" IN (
        SELECT id FROM "goal"
        WHERE "workspaceId" IN (SELECT id FROM "workspace" WHERE type = 'group')
      )
   OR "transactionId" IN (
        SELECT t.id FROM "transaction" t
        WHERE t."workspaceId" IN (SELECT id FROM "workspace" WHERE type = 'group')
           OR t."accountId" IN (
                SELECT fa.id FROM "finance_account" fa
                JOIN "workspace" w ON w.id = fa."workspaceId"
                WHERE w.type = 'group'
              )
           OR t."counterpartyAccountId" IN (
                SELECT fa.id FROM "finance_account" fa
                JOIN "workspace" w ON w.id = fa."workspaceId"
                WHERE w.type = 'group'
              )
      );

DELETE FROM "transaction"
WHERE "workspaceId" IN (SELECT id FROM "workspace" WHERE type = 'group')
   OR "accountId" IN (
        SELECT fa.id FROM "finance_account" fa
        JOIN "workspace" w ON w.id = fa."workspaceId"
        WHERE w.type = 'group'
      )
   OR "counterpartyAccountId" IN (
        SELECT fa.id FROM "finance_account" fa
        JOIN "workspace" w ON w.id = fa."workspaceId"
        WHERE w.type = 'group'
      );

DELETE FROM "recurring_rule"
WHERE "workspaceId" IN (SELECT id FROM "workspace" WHERE type = 'group')
   OR "accountId" IN (
        SELECT fa.id FROM "finance_account" fa
        JOIN "workspace" w ON w.id = fa."workspaceId"
        WHERE w.type = 'group'
      )
   OR "counterpartyAccountId" IN (
        SELECT fa.id FROM "finance_account" fa
        JOIN "workspace" w ON w.id = fa."workspaceId"
        WHERE w.type = 'group'
      );

DELETE FROM "budget_category"
WHERE "budgetId" IN (
  SELECT id FROM "budget"
  WHERE "workspaceId" IN (SELECT id FROM "workspace" WHERE type = 'group')
);

DELETE FROM "budget"
WHERE "workspaceId" IN (SELECT id FROM "workspace" WHERE type = 'group');

UPDATE "goal"
SET "linkedAccountId" = NULL
WHERE "workspaceId" IN (SELECT id FROM "workspace" WHERE type = 'group')
   OR "linkedAccountId" IN (
        SELECT fa.id FROM "finance_account" fa
        JOIN "workspace" w ON w.id = fa."workspaceId"
        WHERE w.type = 'group'
      );

DELETE FROM "goal"
WHERE "workspaceId" IN (SELECT id FROM "workspace" WHERE type = 'group');

UPDATE "category"
SET "parentId" = NULL
WHERE "workspaceId" IN (SELECT id FROM "workspace" WHERE type = 'group');

DELETE FROM "category"
WHERE "workspaceId" IN (SELECT id FROM "workspace" WHERE type = 'group');

DELETE FROM "finance_account"
WHERE "workspaceId" IN (SELECT id FROM "workspace" WHERE type = 'group');

DELETE FROM "workspace_consolidation_rate"
WHERE "workspaceId" IN (SELECT id FROM "workspace" WHERE type = 'group');

DELETE FROM "invitation";

DELETE FROM "membership"
WHERE "workspaceId" IN (SELECT id FROM "workspace" WHERE type = 'group');

DELETE FROM "workspace" WHERE type = 'group';

-- ---------------------------------------------------------------------------
-- 2. Drop old tables / enums.
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS "cross_workspace_link";
DROP TABLE IF EXISTS "invitation";
DROP TABLE IF EXISTS "expense_split_share";
DROP TABLE IF EXISTS "expense_split";
DROP TABLE IF EXISTS "settlement";

DROP TYPE IF EXISTS "CrossWorkspaceLinkKind";
DROP TYPE IF EXISTS "InvitationStatus";

-- Keep unused `WorkspaceType.group` in Postgres. Product never writes it
-- after the DELETE above; dropping the enum label here 500s any preview
-- that has not run this migration yet (Prisma cannot decode leftover rows).
-- Follow-up: drop the label once every environment has applied this migration.

-- ---------------------------------------------------------------------------
-- 3. New SplitGroup model.
-- ---------------------------------------------------------------------------

CREATE TYPE "SplitGroupKind" AS ENUM ('ongoing', 'one_time');
CREATE TYPE "SplitMemberKind" AS ENUM ('user', 'ghost');

CREATE TABLE "split_group" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "SplitGroupKind" NOT NULL,
    "currency" TEXT NOT NULL,
    "publicShareToken" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "split_group_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "split_group_publicShareToken_key" ON "split_group"("publicShareToken");
CREATE INDEX "split_group_workspaceId_idx" ON "split_group"("workspaceId");
CREATE INDEX "split_group_createdByUserId_idx" ON "split_group"("createdByUserId");

ALTER TABLE "split_group"
  ADD CONSTRAINT "split_group_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "split_group_member" (
    "id" TEXT NOT NULL,
    "splitGroupId" TEXT NOT NULL,
    "kind" "SplitMemberKind" NOT NULL,
    "userId" TEXT,
    "displayName" TEXT NOT NULL,
    "displayNameKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "split_group_member_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "split_group_member_splitGroupId_userId_key"
  ON "split_group_member"("splitGroupId", "userId");
CREATE UNIQUE INDEX "split_group_member_splitGroupId_displayNameKey_key"
  ON "split_group_member"("splitGroupId", "displayNameKey");
CREATE INDEX "split_group_member_userId_idx" ON "split_group_member"("userId");

ALTER TABLE "split_group_member"
  ADD CONSTRAINT "split_group_member_splitGroupId_fkey"
  FOREIGN KEY ("splitGroupId") REFERENCES "split_group"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "split_group_member"
  ADD CONSTRAINT "split_group_member_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "split_group_member"
  ADD CONSTRAINT "split_group_member_kind_userId_check"
  CHECK (
    ("kind" = 'user' AND "userId" IS NOT NULL)
    OR ("kind" = 'ghost' AND "userId" IS NULL)
  );

CREATE TABLE "expense_split" (
    "id" TEXT NOT NULL,
    "splitGroupId" TEXT NOT NULL,
    "expenseTransactionId" TEXT NOT NULL,
    "paidByMemberId" TEXT NOT NULL,
    "method" "SplitMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_split_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "expense_split_expenseTransactionId_key"
  ON "expense_split"("expenseTransactionId");
CREATE INDEX "expense_split_splitGroupId_idx" ON "expense_split"("splitGroupId");
CREATE INDEX "expense_split_paidByMemberId_idx" ON "expense_split"("paidByMemberId");

ALTER TABLE "expense_split"
  ADD CONSTRAINT "expense_split_splitGroupId_fkey"
  FOREIGN KEY ("splitGroupId") REFERENCES "split_group"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expense_split"
  ADD CONSTRAINT "expense_split_expenseTransactionId_fkey"
  FOREIGN KEY ("expenseTransactionId") REFERENCES "transaction"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expense_split"
  ADD CONSTRAINT "expense_split_paidByMemberId_fkey"
  FOREIGN KEY ("paidByMemberId") REFERENCES "split_group_member"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "expense_split_share" (
    "id" TEXT NOT NULL,
    "splitId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "shareCents" INTEGER NOT NULL,

    CONSTRAINT "expense_split_share_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "expense_split_share_splitId_memberId_key"
  ON "expense_split_share"("splitId", "memberId");
CREATE INDEX "expense_split_share_memberId_idx" ON "expense_split_share"("memberId");

ALTER TABLE "expense_split_share"
  ADD CONSTRAINT "expense_split_share_splitId_fkey"
  FOREIGN KEY ("splitId") REFERENCES "expense_split"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expense_split_share"
  ADD CONSTRAINT "expense_split_share_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "split_group_member"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "settlement" (
    "id" TEXT NOT NULL,
    "splitGroupId" TEXT NOT NULL,
    "fromMemberId" TEXT NOT NULL,
    "toMemberId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "occurredOn" DATE NOT NULL,
    "note" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "settlement_splitGroupId_occurredOn_idx"
  ON "settlement"("splitGroupId", "occurredOn");

ALTER TABLE "settlement"
  ADD CONSTRAINT "settlement_splitGroupId_fkey"
  FOREIGN KEY ("splitGroupId") REFERENCES "split_group"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "settlement"
  ADD CONSTRAINT "settlement_fromMemberId_fkey"
  FOREIGN KEY ("fromMemberId") REFERENCES "split_group_member"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "settlement"
  ADD CONSTRAINT "settlement_toMemberId_fkey"
  FOREIGN KEY ("toMemberId") REFERENCES "split_group_member"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 4. RLS lockdown for new public tables (KRI-18).
-- ---------------------------------------------------------------------------

SELECT public.apply_rls_lockdown_to_public_tables();
