-- KRI-18: Lockdown `public` against PostgREST (anon / authenticated).
-- Product I/O is Prisma via DATABASE_URL (role with BYPASSRLS). Do not FORCE RLS.

CREATE OR REPLACE FUNCTION public.apply_rls_lockdown_to_public_tables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  r RECORD;
  pol_name constant text := 'deny_anon_authenticated';
  has_anon boolean;
  has_authenticated boolean;
BEGIN
  has_anon := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon');
  has_authenticated := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated');

  FOR r IN
    SELECT c.oid, n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND NOT c.relispartition
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      r.schema_name,
      r.table_name
    );

    IF has_anon AND has_authenticated THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_policy p
        WHERE p.polrelid = r.oid
          AND p.polname = pol_name
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
          pol_name,
          r.schema_name,
          r.table_name
        );
      END IF;

      EXECUTE format(
        'REVOKE ALL ON TABLE %I.%I FROM PUBLIC, anon, authenticated',
        r.schema_name,
        r.table_name
      );
    ELSE
      EXECUTE format(
        'REVOKE ALL ON TABLE %I.%I FROM PUBLIC',
        r.schema_name,
        r.table_name
      );
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_rls_lockdown_to_public_tables() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_rls_lockdown_to_public_tables() TO postgres;

SELECT public.apply_rls_lockdown_to_public_tables();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
    REVOKE USAGE ON SCHEMA public FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;
    REVOKE USAGE ON SCHEMA public FROM authenticated;
  END IF;

  REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
  REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
  REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
END $$;

DO $$
BEGIN
  ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM authenticated;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
      REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
      REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
      REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Could not alter default privileges for role postgres: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
      REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
      REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
      REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Could not alter default privileges for role supabase_admin: %', SQLERRM;
END $$;

-- Empty schema for PostgREST so Data API does not expose `public`.
CREATE SCHEMA IF NOT EXISTS postgrest_locked;
COMMENT ON SCHEMA postgrest_locked IS
  'Empty schema exposed to PostgREST (KRI-18). public stays off the Data API.';

GRANT USAGE ON SCHEMA postgrest_locked TO postgres;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT USAGE ON SCHEMA postgrest_locked TO anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT USAGE ON SCHEMA postgrest_locked TO authenticated;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    ALTER ROLE authenticator SET pgrst.db_schemas = 'postgrest_locked';
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Could not restrict authenticator pgrst.db_schemas: %', SQLERRM;
END $$;

NOTIFY pgrst, 'reload config';

-- Hosted Supabase `postgres` cannot CREATE EVENT TRIGGER. After any future
-- CREATE TABLE in public, re-run:
--   SELECT public.apply_rls_lockdown_to_public_tables();
