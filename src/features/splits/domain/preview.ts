import { allocateEqual } from "./allocate";
import { InvalidSplitInputError } from "./errors";
import type { EqualSplitPreview } from "./types";

/**
 * Product preview numbers. Delegates remainder to `allocateEqual` — never a
 * second rounding rule (SPEC-10 T-12).
 */
export function previewEqualSplit(input: {
  totalCents: number;
  memberIds: readonly string[];
  payerMemberId: string;
}): EqualSplitPreview {
  const shares = allocateEqual(input.totalCents, input.memberIds);
  const payerShare = shares.find((s) => s.memberId === input.payerMemberId);
  if (!payerShare) {
    throw new InvalidSplitInputError("Payer must be a split participant");
  }

  const n = input.memberIds.length;
  const baseCents = Math.floor(input.totalCents / n);
  const remainderCents = input.totalCents % n;

  return {
    shares,
    participantCount: n,
    baseCents,
    remainderCents,
    payerMemberId: input.payerMemberId,
    payerShareCents: payerShare.shareCents,
    othersOwePayerCents: input.totalCents - payerShare.shareCents,
  };
}
