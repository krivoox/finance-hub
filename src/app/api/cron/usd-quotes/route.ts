import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { refreshUsdQuotes } from "@/features/fx-quotes/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(request: Request): boolean {
  const secret = env.CRON_SECRET;
  if (!secret) {
    // Local/dev without secret: allow only in non-production
    return env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * SPEC-19 — Daily USD quotes refresh (Vercel Cron).
 * Schedule: ~15:00 ART = 18:00 UTC.
 */
export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.USD_QUOTES_ENABLED) {
    return NextResponse.json({ ok: true, skipped: true, reason: "disabled" });
  }

  try {
    const result = await refreshUsdQuotes();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refresh failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
