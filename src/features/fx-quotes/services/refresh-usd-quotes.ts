import "server-only";

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { todayDateOnly } from "@/features/recurring/domain/date-only";
import {
  assertSnapshotUsable,
  mapDolarApiPayloadToQuoteLines,
  USD_QUOTE_PROVIDER,
  USD_QUOTE_PROVIDER_URL,
  USD_QUOTE_TZ,
  type DolarApiCasaDto,
} from "@/features/fx-quotes/domain";

export type RefreshUsdQuotesResult = {
  snapshotId: string;
  asOfDate: string;
  lineCount: number;
};

type QuoteLineInput = {
  casa: string;
  nombre: string;
  buyRateScaled: number;
  sellRateScaled: number;
  scale: number;
  providerUpdatedAt: Date;
};

function asOfDateToUtcMidnight(asOfDate: string): Date {
  return new Date(`${asOfDate}T00:00:00.000Z`);
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}

async function upsertSnapshotWithLines(
  asOfUtc: Date,
  now: Date,
  providerUrl: string,
  lines: QuoteLineInput[],
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const snapshot = await tx.usdQuoteSnapshot.upsert({
      where: { asOfDate: asOfUtc },
      create: {
        asOfDate: asOfUtc,
        fetchedAt: now,
        provider: USD_QUOTE_PROVIDER,
        providerUrl,
      },
      update: {
        fetchedAt: now,
        provider: USD_QUOTE_PROVIDER,
        providerUrl,
      },
      select: { id: true },
    });

    await tx.usdQuoteLine.deleteMany({ where: { snapshotId: snapshot.id } });
    await tx.usdQuoteLine.createMany({
      data: lines.map((line) => ({
        snapshotId: snapshot.id,
        casa: line.casa,
        nombre: line.nombre,
        buyRateScaled: line.buyRateScaled,
        sellRateScaled: line.sellRateScaled,
        scale: line.scale,
        providerUpdatedAt: line.providerUpdatedAt,
      })),
    });

    return snapshot;
  });
}

/**
 * SPEC-19 FR-01 — Fetch DolarApi once and upsert the day's snapshot.
 * Idempotent under concurrent callers (unique on asOfDate).
 * Does not mutate WorkspaceConsolidationRate.
 */
export async function refreshUsdQuotes(input?: {
  now?: Date;
}): Promise<RefreshUsdQuotesResult> {
  if (!env.USD_QUOTES_ENABLED) {
    throw new Error("USD quotes feature is disabled");
  }

  const now = input?.now ?? new Date();
  const asOfDate = todayDateOnly(now, USD_QUOTE_TZ);
  const url = `${env.DOLARAPI_BASE_URL.replace(/\/$/, "")}/v1/dolares`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`DolarApi HTTP ${res.status}`);
  }

  const json = (await res.json()) as unknown;
  if (!Array.isArray(json)) {
    throw new Error("DolarApi payload inválido");
  }

  const lines = mapDolarApiPayloadToQuoteLines(json as DolarApiCasaDto[]);
  assertSnapshotUsable(lines);

  const asOfUtc = asOfDateToUtcMidnight(asOfDate);
  const providerUrl = url.includes("dolarapi.com")
    ? USD_QUOTE_PROVIDER_URL
    : url;

  let snapshot: { id: string };
  try {
    snapshot = await upsertSnapshotWithLines(
      asOfUtc,
      now,
      providerUrl,
      lines,
    );
  } catch (err) {
    // Concurrent refresh can race on line unique (snapshotId, casa) after both
    // deleteMany. Snapshot upsert itself is ON CONFLICT-safe.
    if (!isUniqueConstraintError(err)) throw err;
    if (env.NODE_ENV === "development") {
      console.warn(
        "[fx-quotes] concurrent snapshot write race; retrying upsert once",
      );
    }
    snapshot = await upsertSnapshotWithLines(
      asOfUtc,
      now,
      providerUrl,
      lines,
    );
  }

  return {
    snapshotId: snapshot.id,
    asOfDate,
    lineCount: lines.length,
  };
}
