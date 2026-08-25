-- Relabel leftover group tenants as the personal ledger.
-- Does NOT delete accounts, transactions, budgets, or goals.
-- Safe/idempotent if the previous KRI-29 migration already removed group rows.

UPDATE "workspace"
SET type = 'personal'
WHERE type = 'group';
