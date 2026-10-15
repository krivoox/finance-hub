-- Align the database with `Workspace.type @default(personal)` in schema.prisma.
-- The default was added to the Prisma schema without a corresponding migration,
-- which produced drift between applied migrations and the schema (ADR/SPEC-02).
ALTER TABLE "workspace" ALTER COLUMN "type" SET DEFAULT 'personal';
