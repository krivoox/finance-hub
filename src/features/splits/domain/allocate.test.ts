import { describe, expect, it } from "vitest";
import {
  allocateEqual,
  allocateExact,
  allocatePercentage,
  assertGroupWorkspace,
  computeMemberBalances,
  InvalidPercentageError,
  NotAGroupWorkspaceError,
  SplitSumMismatchError,
} from "./index";

describe("allocateEqual (SPEC-10 T-01)", () => {
  it("splits 100 cents among a,b,c as 34,33,33", () => {
    const shares = allocateEqual(100, ["c", "a", "b"]);
    expect(shares).toEqual([
      { userId: "a", shareCents: 34 },
      { userId: "b", shareCents: 33 },
      { userId: "c", shareCents: 33 },
    ]);
    expect(shares.reduce((s, x) => s + x.shareCents, 0)).toBe(100);
  });

  it("always sums to total (property)", () => {
    for (const total of [1, 2, 3, 99, 101, 1000]) {
      const ids = ["u1", "u2", "u3", "u4"];
      const shares = allocateEqual(total, ids);
      expect(shares.reduce((s, x) => s + x.shareCents, 0)).toBe(total);
    }
  });
});

describe("allocateExact (SPEC-10 T-02 / T-03)", () => {
  it("accepts exact shares that sum to total", () => {
    expect(
      allocateExact(1000, [
        { userId: "a", cents: 600 },
        { userId: "b", cents: 400 },
      ]),
    ).toEqual([
      { userId: "a", shareCents: 600 },
      { userId: "b", shareCents: 400 },
    ]);
  });

  it("rejects mismatch", () => {
    expect(() =>
      allocateExact(1000, [
        { userId: "a", cents: 600 },
        { userId: "b", cents: 300 },
      ]),
    ).toThrow(SplitSumMismatchError);
  });
});

describe("allocatePercentage (SPEC-10 T-04)", () => {
  it("50/50 over 101 sums to 101 with remainder rule", () => {
    const shares = allocatePercentage(101, [
      { userId: "b", percent: 50 },
      { userId: "a", percent: 50 },
    ]);
    expect(shares.reduce((s, x) => s + x.shareCents, 0)).toBe(101);
    // sorted a,b — floor(50.5)=50 each → remainder 1 → a gets +1 → 51,50
    expect(shares).toEqual([
      { userId: "a", shareCents: 51 },
      { userId: "b", shareCents: 50 },
    ]);
  });

  it("rejects percent sum !== 100", () => {
    expect(() =>
      allocatePercentage(100, [
        { userId: "a", percent: 40 },
        { userId: "b", percent: 40 },
      ]),
    ).toThrow(InvalidPercentageError);
  });
});

describe("computeMemberBalances (SPEC-10 T-05 / T-06)", () => {
  it("Ana pays 9000 equal Ana+Bob → Bob owes Ana 4500", () => {
    const shares = allocateEqual(9000, ["ana", "bob"]);
    const balances = computeMemberBalances(
      [{ paidByUserId: "ana", shares }],
      [],
      ["ana", "bob"],
    );
    expect(balances).toEqual([
      { userId: "ana", netCents: 4500 },
      { userId: "bob", netCents: -4500 },
    ]);
  });

  it("settlement Bob→Ana 4500 zeros the pair", () => {
    const shares = allocateEqual(9000, ["ana", "bob"]);
    const balances = computeMemberBalances(
      [{ paidByUserId: "ana", shares }],
      [{ fromUserId: "bob", toUserId: "ana", amountCents: 4500 }],
      ["ana", "bob"],
    );
    expect(balances).toEqual([
      { userId: "ana", netCents: 0 },
      { userId: "bob", netCents: 0 },
    ]);
  });
});

describe("assertGroupWorkspace (SPEC-09 T-02 / SPEC-10 T-07)", () => {
  it("allows group", () => {
    expect(() => assertGroupWorkspace("group")).not.toThrow();
  });

  it("rejects personal", () => {
    expect(() => assertGroupWorkspace("personal")).toThrow(
      NotAGroupWorkspaceError,
    );
  });
});
