/** Serializable DTOs for SPEC-19 (safe to import from client components). */

export type UsdQuoteLineDto = {
  casa: string;
  nombre: string;
  displayName: string;
  buyRateScaled: number;
  sellRateScaled: number;
  scale: number;
  sellArsPerUsd: number;
  buyArsPerUsd: number;
  providerUpdatedAt: string;
};

export type UsdQuotesDto = {
  enabled: boolean;
  available: boolean;
  stale: boolean;
  asOfDate: string | null;
  fetchedAt: string | null;
  attribution: string;
  oficial: UsdQuoteLineDto | null;
  mep: UsdQuoteLineDto | null;
};
