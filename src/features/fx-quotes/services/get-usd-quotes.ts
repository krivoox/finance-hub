import "server-only";

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { dateOnlyFromUtcDate } from "@/features/recurring/domain/date-only";
import { rateScaledToArsPerUsd } from "@/features/dashboard/domain/consolidation";
import {
  isQuoteSnapshotStale,
  USD_QUOTE_TZ,
} from "@/features/fx-quotes/domain";
import { refreshUsdQuotes } from "./refresh-usd-quotes";
import type { UsdQuoteLineDto, UsdQuotesDto } from "../types";

export type { UsdQuoteLineDto, UsdQuotesDto };

function displayNameForCasa(casa: string, nombre: string): string {
  if (casa === "bolsa") return "MEP";
  return nombre || casa;
}

function toLineDto(row: {
  casa: string;
  nombre: string;
  buyRateScaled: number;
  sellRateScaled: number;
  scale: number;
  providerUpdatedAt: Date;
}): UsdQuoteLineDto {
  return {
    casa: row.casa,
    nombre: row.nombre,
    displayName: displayNameForCasa(row.casa, row.nombre),
    buyRateScaled: row.buyRateScaled,
    sellRateScaled: row.sellRateScaled,
    scale: row.scale,
    sellArsPerUsd: rateScaledToArsPerUsd(row.sellRateScaled, row.scale),
    buyArsPerUsd: rateScaledToArsPerUsd(row.buyRateScaled, row.scale),
    providerUpdatedAt: row.providerUpdatedAt.toISOString(),
  };
}

const EMPTY: UsdQuotesDto = {
  enabled: false,
  available: false,
  stale: false,
  asOfDate: null,
  fetchedAt: null,
  attribution: "Datos: DolarApi.com",
  oficial: null,
  mep: null,
};

async function loadLatestSnapshot() {
  return prisma.usdQuoteSnapshot.findFirst({
    orderBy: { asOfDate: "desc" },
    include: { lines: true },
  });
}

/** Coalesce in-process concurrent seed-if-empty (dashboard + sibling RSC). */
let seedInFlight: Promise<void> | null = null;

async function seedQuotesOnce(now: Date): Promise<void> {
  if (!seedInFlight) {
    seedInFlight = refreshUsdQuotes({ now })
      .then(() => undefined)
      .finally(() => {
        seedInFlight = null;
      });
  }
  await seedInFlight;
}

/**
 * SPEC-19 FR-02 — Read cached quotes. Seeds from provider only when DB is empty
 * (cron is the primary refresh path; pageviews do not hit DolarApi otherwise).
 *
 * Never throws: missing delegate/table/provider failures degrade to
 * `{ enabled: true, available: false }` so AppLayout stays up.
 */
export async function getUsdQuotes(input?: {
  now?: Date;
  seedIfEmpty?: boolean;
}): Promise<UsdQuotesDto> {
  if (!env.USD_QUOTES_ENABLED) {
    return { ...EMPTY, enabled: false };
  }

  try {
    const now = input?.now ?? new Date();
    const seedIfEmpty = input?.seedIfEmpty ?? true;

    let snapshot = await loadLatestSnapshot();

    if (!snapshot && seedIfEmpty) {
      try {
        await seedQuotesOnce(now);
        snapshot = await loadLatestSnapshot();
      } catch (err) {
        if (env.NODE_ENV === "development") {
          console.warn("[fx-quotes] seed-if-empty failed:", err);
        }
        return { ...EMPTY, enabled: true, available: false, stale: true };
      }
    }

    if (!snapshot) {
      return { ...EMPTY, enabled: true, available: false, stale: true };
    }

    const asOfDate = dateOnlyFromUtcDate(snapshot.asOfDate);
    const stale = isQuoteSnapshotStale({
      asOfDate,
      fetchedAt: snapshot.fetchedAt,
      now,
      timeZone: USD_QUOTE_TZ,
    });

    const oficialRow = snapshot.lines.find((l) => l.casa === "oficial");
    const bolsaRow = snapshot.lines.find((l) => l.casa === "bolsa");

    if (!oficialRow || !bolsaRow) {
      return {
        ...EMPTY,
        enabled: true,
        available: false,
        stale: true,
        asOfDate,
        fetchedAt: snapshot.fetchedAt.toISOString(),
      };
    }

    return {
      enabled: true,
      available: true,
      stale,
      asOfDate,
      fetchedAt: snapshot.fetchedAt.toISOString(),
      attribution: "Datos: DolarApi.com",
      oficial: toLineDto(oficialRow),
      mep: toLineDto(bolsaRow),
    };
  } catch (err) {
    console.error("[fx-quotes] getUsdQuotes failed:", err);
    return { ...EMPTY, enabled: true, available: false, stale: true };
  }
}
