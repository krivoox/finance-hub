/**
 * Contract for KRI-18 (Supabase RLS deny-all).
 *
 * Product data access is Prisma (`DATABASE_URL`). Postgres RLS is defense in
 * depth against PostgREST / the anon key — not workspace tenancy.
 */

const MODEL_RE = /^\s*model\s+(\w+)/gm;
const MAP_RE = /@@map\("([^"]+)"\)/g;

export function extractPrismaModelNames(schemaPrisma: string): string[] {
  return [...schemaPrisma.matchAll(MODEL_RE)].map((match) => match[1]!);
}

export function extractPrismaMappedTables(schemaPrisma: string): string[] {
  const tables = [...schemaPrisma.matchAll(MAP_RE)].map((match) => match[1]!);
  return [...new Set(tables)].toSorted();
}

export function lockdownSqlCoversPublicTables(sql: string): boolean {
  const required = [
    "ENABLE ROW LEVEL SECURITY",
    "deny_anon_authenticated",
    "TO anon, authenticated",
    "USING (false)",
    "WITH CHECK (false)",
    "REVOKE ALL",
    "pgrst.db_schemas",
    "apply_rls_lockdown_to_public_tables",
  ];
  return required.every((token) => sql.includes(token));
}
