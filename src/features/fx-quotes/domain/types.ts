import { CONSOLIDATION_RATE_SCALE } from "@/features/dashboard/domain/consolidation";

export const USD_QUOTE_SCALE = CONSOLIDATION_RATE_SCALE;
export const USD_QUOTE_TZ = "America/Argentina/Buenos_Aires";
/** SPEC-19 §4.4 — snapshot older than this is stale even on the same calendar day. */
export const USD_QUOTE_MAX_AGE_MS = 36 * 60 * 60 * 1000;

export const USD_QUOTE_PROVIDER = "dolarapi" as const;
export const USD_QUOTE_PROVIDER_URL = "https://dolarapi.com/v1/dolares";

export type QuoteCasa = "oficial" | "bolsa" | "tarjeta" | (string & {});
export type QuoteSide = "buy" | "sell";

/** Raw casa row from DolarApi `GET /v1/dolares`. */
export type DolarApiCasaDto = {
  readonly moneda?: string;
  readonly casa: string;
  readonly nombre: string;
  readonly compra: number;
  readonly venta: number;
  readonly fechaActualizacion: string;
};

export type UsdQuoteLineDraft = {
  readonly casa: QuoteCasa;
  readonly nombre: string;
  readonly buyRateScaled: number;
  readonly sellRateScaled: number;
  readonly scale: number;
  readonly providerUpdatedAt: Date;
};

export type ConsolidationRateFromMep = {
  readonly rateScaled: number;
  readonly scale: number;
  readonly label: "MEP";
  readonly quoteCurrency: "USD";
  readonly asOf: Date;
};
