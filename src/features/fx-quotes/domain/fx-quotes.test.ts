import { describe, expect, it } from "vitest";

import {
  assertSnapshotUsable,
  buildConsolidationRateFromMepQuote,
  convertWithUsdQuote,
  IncompleteUsdQuoteSnapshotError,
  InvalidUsdQuoteRateError,
  isQuoteSnapshotStale,
  majorArsPerUsdToRateScaled,
  mapDolarApiPayloadToQuoteLines,
  MepQuoteUnavailableError,
  pickRateScaled,
  USD_QUOTE_SCALE,
  type DolarApiCasaDto,
} from "./index";

const SAMPLE_PAYLOAD: DolarApiCasaDto[] = [
  {
    moneda: "USD",
    casa: "oficial",
    nombre: "Oficial",
    compra: 1470,
    venta: 1520,
    fechaActualizacion: "2026-08-06T12:00:00.000Z",
  },
  {
    moneda: "USD",
    casa: "bolsa",
    nombre: "Bolsa",
    compra: 1519.8,
    venta: 1521.1,
    fechaActualizacion: "2026-08-06T14:57:00.000Z",
  },
  {
    moneda: "USD",
    casa: "tarjeta",
    nombre: "Tarjeta",
    compra: 1911,
    venta: 1976,
    fechaActualizacion: "2026-08-06T12:00:00.000Z",
  },
];

describe("majorArsPerUsdToRateScaled — SPEC-19 T-01…T-03", () => {
  it("scales venta MEP 1521.1", () => {
    expect(majorArsPerUsdToRateScaled(1521.1)).toBe(1_521_100_000);
  });

  it("scales compra 1519.8 without float residue", () => {
    expect(majorArsPerUsdToRateScaled(1519.8)).toBe(1_519_800_000);
  });

  it("rejects non-positive / non-finite", () => {
    expect(() => majorArsPerUsdToRateScaled(0)).toThrow(
      InvalidUsdQuoteRateError,
    );
    expect(() => majorArsPerUsdToRateScaled(-1)).toThrow(
      InvalidUsdQuoteRateError,
    );
    expect(() => majorArsPerUsdToRateScaled(Number.NaN)).toThrow(
      InvalidUsdQuoteRateError,
    );
  });
});

describe("mapDolarApiPayloadToQuoteLines — SPEC-19 T-04", () => {
  it("maps oficial, bolsa and tarjeta", () => {
    const lines = mapDolarApiPayloadToQuoteLines(SAMPLE_PAYLOAD);
    expect(lines).toHaveLength(3);
    const bolsa = lines.find((l) => l.casa === "bolsa");
    expect(bolsa?.buyRateScaled).toBe(1_519_800_000);
    expect(bolsa?.sellRateScaled).toBe(1_521_100_000);
    expect(bolsa?.scale).toBe(USD_QUOTE_SCALE);
    expect(bolsa?.providerUpdatedAt.toISOString()).toBe(
      "2026-08-06T14:57:00.000Z",
    );
  });

  it("keeps unknown casa as string", () => {
    const lines = mapDolarApiPayloadToQuoteLines([
      {
        casa: "cripto",
        nombre: "Cripto",
        compra: 1500,
        venta: 1510,
        fechaActualizacion: "2026-08-06T12:00:00.000Z",
      },
      SAMPLE_PAYLOAD[0],
      SAMPLE_PAYLOAD[1],
    ]);
    expect(lines.some((l) => l.casa === "cripto")).toBe(true);
  });
});

describe("assertSnapshotUsable — SPEC-19 T-05", () => {
  it("passes when oficial + bolsa present", () => {
    expect(() =>
      assertSnapshotUsable(mapDolarApiPayloadToQuoteLines(SAMPLE_PAYLOAD)),
    ).not.toThrow();
  });

  it("rejects missing bolsa", () => {
    const onlyOficial = mapDolarApiPayloadToQuoteLines([SAMPLE_PAYLOAD[0]]);
    expect(() => assertSnapshotUsable(onlyOficial)).toThrow(
      IncompleteUsdQuoteSnapshotError,
    );
  });
});

describe("isQuoteSnapshotStale — SPEC-19 T-06…T-08", () => {
  const tz = "America/Argentina/Buenos_Aires";

  it("is stale when asOfDate is yesterday", () => {
    // 2026-08-06 15:00 ART = 18:00 UTC
    const now = new Date("2026-08-06T18:00:00.000Z");
    expect(
      isQuoteSnapshotStale({
        asOfDate: "2026-08-05",
        fetchedAt: new Date("2026-08-05T18:00:00.000Z"),
        now,
        timeZone: tz,
      }),
    ).toBe(true);
  });

  it("is not stale same day fresh", () => {
    const now = new Date("2026-08-06T18:00:00.000Z");
    expect(
      isQuoteSnapshotStale({
        asOfDate: "2026-08-06",
        fetchedAt: new Date("2026-08-06T16:00:00.000Z"),
        now,
        timeZone: tz,
      }),
    ).toBe(false);
  });

  it("is stale when age > 36h even if asOfDate matches", () => {
    const now = new Date("2026-08-06T18:00:00.000Z");
    expect(
      isQuoteSnapshotStale({
        asOfDate: "2026-08-06",
        fetchedAt: new Date("2026-08-05T02:00:00.000Z"), // 40h earlier
        now,
        timeZone: tz,
      }),
    ).toBe(true);
  });
});

describe("convertWithUsdQuote — SPEC-19 T-09 / T-10", () => {
  const line = {
    buyRateScaled: 1_500_000_000,
    sellRateScaled: 1_520_000_000, // 1520 ARS/USD
    scale: USD_QUOTE_SCALE,
  };

  it("converts USD → ARS with sell", () => {
    expect(
      convertWithUsdQuote({
        amountCents: 1000,
        from: "USD",
        to: "ARS",
        line,
        side: "sell",
      }),
    ).toBe(1_520_000);
  });

  it("converts ARS → USD with sell", () => {
    expect(
      convertWithUsdQuote({
        amountCents: 1_520_000,
        from: "ARS",
        to: "USD",
        line,
        side: "sell",
      }),
    ).toBe(1000);
  });

  it("pickRateScaled buy vs sell", () => {
    expect(pickRateScaled(line, "buy")).toBe(1_500_000_000);
    expect(pickRateScaled(line, "sell")).toBe(1_520_000_000);
  });
});

describe("buildConsolidationRateFromMepQuote — SPEC-19 T-11 / T-12", () => {
  it("builds MEP patch from bolsa sell", () => {
    const asOf = new Date("2026-08-06T14:57:00.000Z");
    const patch = buildConsolidationRateFromMepQuote({
      casa: "bolsa",
      sellRateScaled: 1_521_100_000,
      scale: USD_QUOTE_SCALE,
      providerUpdatedAt: asOf,
    });
    expect(patch).toEqual({
      rateScaled: 1_521_100_000,
      scale: USD_QUOTE_SCALE,
      label: "MEP",
      quoteCurrency: "USD",
      asOf,
    });
  });

  it("rejects non-bolsa", () => {
    expect(() =>
      buildConsolidationRateFromMepQuote({
        casa: "tarjeta",
        sellRateScaled: 1_976_000_000,
        scale: USD_QUOTE_SCALE,
        providerUpdatedAt: new Date(),
      }),
    ).toThrow(MepQuoteUnavailableError);
  });
});
