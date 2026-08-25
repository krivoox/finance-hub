import {
  InvalidPercentageError,
  InvalidSplitInputError,
  SplitSumMismatchError,
} from "./errors";
import type { SplitShare } from "./types";

/**
 * SPEC-10 normative equal allocation:
 * sort memberIds ascending; base = floor(total/n); remainder = total % n;
 * first `remainder` members (by sorted order) get +1 cent.
 */
export function allocateEqual(
  totalCents: number,
  memberIds: readonly string[],
): SplitShare[] {
  assertPositiveTotal(totalCents);
  if (memberIds.length === 0) {
    throw new InvalidSplitInputError("At least one participant is required");
  }
  const unique = [...new Set(memberIds)];
  if (unique.length !== memberIds.length) {
    throw new InvalidSplitInputError("Duplicate memberIds in split participants");
  }

  const sorted = [...unique].toSorted((a, b) => a.localeCompare(b));
  const n = sorted.length;
  const base = Math.floor(totalCents / n);
  const remainder = totalCents % n;

  const shares = sorted.map((memberId, i) => ({
    memberId,
    shareCents: base + (i < remainder ? 1 : 0),
  }));

  assertSharesSum(shares, totalCents);
  return shares;
}

/**
 * Convert percentages (must sum to 100) into cents with the same remainder
 * rule as equal: floor each share, then distribute leftover cents to the
 * first participants by memberId ascending.
 */
export function allocatePercentage(
  totalCents: number,
  percentages: readonly { memberId: string; percent: number }[],
): SplitShare[] {
  assertPositiveTotal(totalCents);
  if (percentages.length === 0) {
    throw new InvalidSplitInputError("At least one participant is required");
  }

  const percentSum = percentages.reduce((acc, p) => acc + p.percent, 0);
  if (percentSum !== 100) {
    throw new InvalidPercentageError();
  }

  const sorted = [...percentages].toSorted((a, b) =>
    a.memberId.localeCompare(b.memberId),
  );

  const floored = sorted.map((p) => ({
    memberId: p.memberId,
    shareCents: Math.floor((totalCents * p.percent) / 100),
  }));

  let allocated = floored.reduce((acc, s) => acc + s.shareCents, 0);
  let remainder = totalCents - allocated;
  for (let i = 0; i < floored.length && remainder > 0; i++) {
    const share = floored[i];
    if (!share) continue;
    share.shareCents += 1;
    remainder -= 1;
    allocated += 1;
  }

  assertSharesSum(floored, totalCents);
  return floored;
}

export function allocateExact(
  totalCents: number,
  exact: readonly { memberId: string; cents: number }[],
): SplitShare[] {
  assertPositiveTotal(totalCents);
  if (exact.length === 0) {
    throw new InvalidSplitInputError("At least one participant is required");
  }
  for (const row of exact) {
    if (!Number.isInteger(row.cents) || row.cents < 0) {
      throw new InvalidSplitInputError("Share cents must be non-negative integers");
    }
  }
  const sum = exact.reduce((acc, row) => acc + row.cents, 0);
  if (sum !== totalCents) {
    throw new SplitSumMismatchError();
  }
  if (!exact.some((row) => row.cents > 0)) {
    throw new InvalidSplitInputError("At least one share must be greater than zero");
  }
  return exact.map((row) => ({ memberId: row.memberId, shareCents: row.cents }));
}

function assertPositiveTotal(totalCents: number): void {
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    throw new InvalidSplitInputError("Total must be a positive integer (cents)");
  }
}

function assertSharesSum(shares: SplitShare[], totalCents: number): void {
  const sum = shares.reduce((acc, s) => acc + s.shareCents, 0);
  if (sum !== totalCents) {
    throw new SplitSumMismatchError();
  }
}
