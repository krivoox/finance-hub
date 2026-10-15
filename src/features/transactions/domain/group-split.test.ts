import { describe, expect, it } from "vitest";

import {
  assertGroupMemberName,
  assertUniqueGroupMemberNames,
  computeGroupSplit,
  hasGroupMemberName,
  normalizeGroupMemberName,
} from "./group-split";
import { DuplicateGroupMemberError, InvalidGroupMemberNameError } from "./errors";

describe("SPEC-23 — computeGroupSplit (equal)", () => {
  it("reparte en partes iguales entre miembros y usuario", () => {
    const result = computeGroupSplit({
      totalCents: 10_000,
      mode: "equal",
      members: [{ name: "Ana" }, { name: "Beto" }],
    });
    expect(result.members).toEqual([
      { name: "Ana", amountCents: 3_333 },
      { name: "Beto", amountCents: 3_333 },
    ]);
    expect(result.userShareCents).toBe(3_334);
    expect(result.unassignedCents).toBe(0);
    expect(result.hasExcess).toBe(false);
  });

  it("da todo al usuario cuando no hay miembros", () => {
    const result = computeGroupSplit({
      totalCents: 5_000,
      mode: "equal",
      members: [],
    });
    expect(result.members).toEqual([]);
    expect(result.userShareCents).toBe(5_000);
  });

  it("absorbe el remanente el usuario (total − Σ miembros)", () => {
    const result = computeGroupSplit({
      totalCents: 100,
      mode: "equal",
      members: [{ name: "Ana" }, { name: "Beto" }, { name: "Caro" }],
    });
    const memberSum = result.members.reduce((a, m) => a + m.amountCents, 0);
    expect(result.userShareCents + memberSum).toBe(100);
    expect(result.members.every((m) => m.amountCents === 25)).toBe(true);
    expect(result.userShareCents).toBe(25);
  });
});

describe("SPEC-23 — computeGroupSplit (custom)", () => {
  it("calcula lo que paga el usuario como remanente", () => {
    const result = computeGroupSplit({
      totalCents: 10_000,
      mode: "custom",
      members: [
        { name: "Ana", amountCents: 4_000 },
        { name: "Beto", amountCents: 2_000 },
      ],
    });
    expect(result.userShareCents).toBe(4_000);
    expect(result.unassignedCents).toBe(4_000);
    expect(result.exceededCents).toBe(0);
    expect(result.hasExcess).toBe(false);
  });

  it("marca excedido cuando los miembros superan el total", () => {
    const result = computeGroupSplit({
      totalCents: 10_000,
      mode: "custom",
      members: [
        { name: "Ana", amountCents: 7_000 },
        { name: "Beto", amountCents: 4_000 },
      ],
    });
    expect(result.userShareCents).toBe(0);
    expect(result.unassignedCents).toBe(0);
    expect(result.exceededCents).toBe(1_000);
    expect(result.hasExcess).toBe(true);
  });

  it("trata montos faltantes como 0", () => {
    const result = computeGroupSplit({
      totalCents: 1_000,
      mode: "custom",
      members: [{ name: "Ana" }],
    });
    expect(result.members[0]?.amountCents).toBe(0);
    expect(result.userShareCents).toBe(1_000);
  });
});

describe("SPEC-23 — validación de miembros", () => {
  it("rechaza totales no positivos", () => {
    expect(() =>
      computeGroupSplit({ totalCents: 0, mode: "equal", members: [] }),
    ).toThrow();
  });

  it("rechaza nombres duplicados (case/espacios)", () => {
    expect(() =>
      computeGroupSplit({
        totalCents: 1_000,
        mode: "equal",
        members: [{ name: "Ana" }, { name: " ana " }],
      }),
    ).toThrow(DuplicateGroupMemberError);
  });

  it("normaliza y valida nombres", () => {
    expect(normalizeGroupMemberName("  Ana   María ")).toBe("Ana María");
    expect(assertGroupMemberName(" Ana ")).toBe("Ana");
    expect(() => assertGroupMemberName("   ")).toThrow(
      InvalidGroupMemberNameError,
    );
    expect(() => assertGroupMemberName("x".repeat(41))).toThrow(
      InvalidGroupMemberNameError,
    );
  });

  it("assertUniqueGroupMemberNames detecta duplicados", () => {
    expect(() => assertUniqueGroupMemberNames(["Ana", "Beto"])).not.toThrow();
    expect(() => assertUniqueGroupMemberNames(["Ana", "ANA"])).toThrow();
  });

  it("hasGroupMemberName ignora mayúsculas", () => {
    expect(hasGroupMemberName(["Ana"], "ana")).toBe(true);
    expect(hasGroupMemberName(["Ana"], "Beto")).toBe(false);
  });
});
