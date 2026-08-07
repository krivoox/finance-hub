import { majorArsPerUsdToRateScaled } from "./scale";
import { USD_QUOTE_SCALE, type DolarApiCasaDto, type UsdQuoteLineDraft } from "./types";
import {
  IncompleteUsdQuoteSnapshotError,
  InvalidUsdQuoteRateError,
} from "./errors";

function parseProviderUpdatedAt(value: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new InvalidUsdQuoteRateError(
      `fechaActualizacion inválida: ${value}`,
    );
  }
  return d;
}

/**
 * Pure map from DolarApi JSON array → quote line drafts.
 * SPEC-19 T-04.
 */
export function mapDolarApiPayloadToQuoteLines(
  payload: readonly DolarApiCasaDto[],
): UsdQuoteLineDraft[] {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new IncompleteUsdQuoteSnapshotError(
      "El provider no devolvió cotizaciones",
    );
  }

  return payload.map((row) => {
    if (!row.casa || typeof row.casa !== "string") {
      throw new InvalidUsdQuoteRateError("casa inválida en el payload");
    }
    return {
      casa: row.casa,
      nombre: row.nombre || row.casa,
      buyRateScaled: majorArsPerUsdToRateScaled(row.compra),
      sellRateScaled: majorArsPerUsdToRateScaled(row.venta),
      scale: USD_QUOTE_SCALE,
      providerUpdatedAt: parseProviderUpdatedAt(row.fechaActualizacion),
    };
  });
}

/**
 * SPEC-19 T-05 — usable UI snapshot requires oficial + bolsa.
 */
export function assertSnapshotUsable(
  lines: readonly UsdQuoteLineDraft[],
): void {
  const hasOficial = lines.some(
    (l) => l.casa === "oficial" && l.buyRateScaled > 0 && l.sellRateScaled > 0,
  );
  const hasBolsa = lines.some(
    (l) => l.casa === "bolsa" && l.buyRateScaled > 0 && l.sellRateScaled > 0,
  );
  if (!hasOficial || !hasBolsa) {
    throw new IncompleteUsdQuoteSnapshotError();
  }
}

export function findQuoteLine(
  lines: readonly UsdQuoteLineDraft[],
  casa: string,
): UsdQuoteLineDraft | undefined {
  return lines.find((l) => l.casa === casa);
}
