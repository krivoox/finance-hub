import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Server-only Supabase helper for a future Storage/Realtime case.
 * Auth de producto es Better Auth; datos relacionales van por Prisma.
 * Do not import from Client Components. There is no browser client until
 * Storage exists with its own RLS (KRI-18). Public tables are deny-all for
 * `anon` / `authenticated`.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components can't write cookies; ignore.
          }
        },
      },
    },
  );
}
