import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  extractPrismaMappedTables,
  extractPrismaModelNames,
  lockdownSqlCoversPublicTables,
} from "./rls-lockdown";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SCHEMA_PATH = path.join(ROOT, "prisma/schema.prisma");
const LOCKDOWN_SQL_PATH = path.join(
  ROOT,
  "prisma/migrations/20260813200000_rls_deny_all_lockdown/migration.sql",
);
const ENV_PATH = path.join(ROOT, "src/lib/env.ts");
const BROWSER_CLIENT_PATH = path.join(ROOT, "src/lib/supabase/client.ts");
const SERVER_CLIENT_PATH = path.join(ROOT, "src/lib/supabase/server.ts");

describe("extractPrismaMappedTables", () => {
  it("returns sorted unique @@map table names", () => {
    const schema = `
      model User {
        id String @id
        @@map("user")
      }
      model Session {
        id String @id
        @@map("session")
      }
    `;
    expect(extractPrismaModelNames(schema)).toEqual(["User", "Session"]);
    expect(extractPrismaMappedTables(schema)).toEqual(["session", "user"]);
  });
});

describe("KRI-18 Supabase RLS lockdown", () => {
  const schema = readFileSync(SCHEMA_PATH, "utf8");
  const models = extractPrismaModelNames(schema);
  const tables = extractPrismaMappedTables(schema);

  it("maps every Prisma model to a public table name", () => {
    expect(models.length).toBeGreaterThan(0);
    expect(tables).toHaveLength(models.length);
    expect(tables).toContain("user");
    expect(tables).toContain("session");
    expect(tables).toContain("transaction");
    expect(tables).toContain("finance_account");
  });

  it("ships a SQL migration that enables RLS deny-all and revokes PostgREST grants", () => {
    const sql = readFileSync(LOCKDOWN_SQL_PATH, "utf8");
    expect(lockdownSqlCoversPublicTables(sql)).toBe(true);
    expect(sql).toContain("postgrest_locked");
    expect(sql).not.toContain("FORCE ROW LEVEL SECURITY");
  });

  it("does not ship a browser Supabase client until Storage has its own RLS", () => {
    expect(existsSync(BROWSER_CLIENT_PATH)).toBe(false);
  });

  it("keeps the server Supabase helper behind server-only", () => {
    const server = readFileSync(SERVER_CLIENT_PATH, "utf8");
    expect(server).toMatch(/import ["']server-only["']/);
    expect(server).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("does not parse SUPABASE_SERVICE_ROLE_KEY in the env schema", () => {
    const envSource = readFileSync(ENV_PATH, "utf8");
    expect(envSource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
