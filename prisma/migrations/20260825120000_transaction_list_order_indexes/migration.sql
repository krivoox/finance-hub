-- List + budget period queries order by occurredOn desc, createdAt desc.
-- Replace the shorter composites so Postgres can use one index for filter + sort.

DROP INDEX IF EXISTS "transaction_workspaceId_occurredOn_idx";
DROP INDEX IF EXISTS "transaction_workspaceId_type_occurredOn_idx";

CREATE INDEX "transaction_workspaceId_occurredOn_createdAt_idx" ON "transaction"("workspaceId", "occurredOn", "createdAt");
CREATE INDEX "transaction_workspaceId_type_occurredOn_createdAt_idx" ON "transaction"("workspaceId", "type", "occurredOn", "createdAt");
