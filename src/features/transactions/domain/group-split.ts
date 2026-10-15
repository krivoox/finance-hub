/**
 * SPEC-23 — Ad-hoc group split (pure domain).
 *
 * The core transaction screen can flag an expense/income as "gasto grupal".
 * Unlike `ExpenseSplit` (SPEC-10), members are free-text names that live only
 * on the transaction — no `SplitGroup` required. This module computes the
 * per-person distribution and validates member input.
 *
 * Money stays in integer cents (ADR-001); the transaction total is always > 0.
 */

import {
  DuplicateGroupMemberError,
  GroupSplitError,
  InvalidGroupMemberNameError,
} from "./errors";

export const GROUP_SPLIT_MODES = ["equal", "custom"] as const;

export type GroupSplitMode = (typeof GROUP_SPLIT_MODES)[number];

export function isGroupSplitMode(value: string): value is GroupSplitMode {
  return value === "equal" || value === "custom";
}

export const GROUP_MEMBER_NAME_MAX_LENGTH = 40;

export type GroupSplitMemberInput = {
  readonly name: string;
  /** Required in `custom` mode; ignored in `equal` mode. */
  readonly amountCents?: number;
};

export type GroupSplitMemberShare = {
  readonly name: string;
  readonly amountCents: number;
};

export type GroupSplitResult = {
  readonly mode: GroupSplitMode;
  readonly members: readonly GroupSplitMemberShare[];
  /** What the current user pays. */
  readonly userShareCents: number;
  /** Cents still to assign (custom mode). 0 when fully assigned. */
  readonly unassignedCents: number;
  /** Cents over the total (custom mode). 0 unless members exceed it. */
  readonly exceededCents: number;
  readonly hasExcess: boolean;
};

export function normalizeGroupMemberName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function nameKey(name: string): string {
  return normalizeGroupMemberName(name).toLocaleLowerCase("es-AR");
}

/** Validates and normalizes a single member name (1…40 chars). */
export function assertGroupMemberName(raw: string): string {
  if (typeof raw !== "string") {
    throw new InvalidGroupMemberNameError("El nombre debe ser texto");
  }
  const normalized = normalizeGroupMemberName(raw);
  if (normalized.length === 0) {
    throw new InvalidGroupMemberNameError();
  }
  if (normalized.length > GROUP_MEMBER_NAME_MAX_LENGTH) {
    throw new InvalidGroupMemberNameError(
      `El nombre admite hasta ${GROUP_MEMBER_NAME_MAX_LENGTH} caracteres`,
    );
  }
  return normalized;
}

/** Case/whitespace-insensitive duplicate detection. */
export function assertUniqueGroupMemberNames(
  names: readonly string[],
): void {
  const seen = new Set<string>();
  for (const name of names) {
    const key = nameKey(name);
    if (seen.has(key)) {
      throw new DuplicateGroupMemberError(normalizeGroupMemberName(name));
    }
    seen.add(key);
  }
}

export function hasGroupMemberName(
  names: readonly string[],
  candidate: string,
): boolean {
  const key = nameKey(candidate);
  return names.some((name) => nameKey(name) === key);
}

export type ComputeGroupSplitInput = {
  readonly totalCents: number;
  readonly mode: GroupSplitMode;
  readonly members: readonly GroupSplitMemberInput[];
};

function assertNonNegativeIntegerCents(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new GroupSplitError(`${label} debe ser un monto válido`);
  }
}

/**
 * Computes the distribution of `totalCents` across the user plus `members`.
 *
 * - `equal`: everyone (members + user) gets `floor(total / (n + 1))`; the
 *   remainder is absorbed by the user, mirroring `total − Σ members`.
 * - `custom`: member amounts are user-provided; the user pays whatever is left
 *   over. When members exceed the total we report `exceededCents` and clamp the
 *   user share to 0.
 */
export function computeGroupSplit(input: ComputeGroupSplitInput): GroupSplitResult {
  const { totalCents, mode, members } = input;
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    throw new GroupSplitError("El monto total debe ser mayor a 0");
  }
  if (!isGroupSplitMode(mode)) {
    throw new GroupSplitError("Modo de división inválido");
  }

  const names = members.map((member) => assertGroupMemberName(member.name));
  assertUniqueGroupMemberNames(names);

  if (mode === "equal") {
    const memberCount = members.length;
    const per = Math.floor(totalCents / (memberCount + 1));
    const memberShares: GroupSplitMemberShare[] = names.map((name) => ({
      name,
      amountCents: per,
    }));
    const userShareCents = totalCents - per * memberCount;
    return {
      mode,
      members: memberShares,
      userShareCents,
      unassignedCents: 0,
      exceededCents: 0,
      hasExcess: false,
    };
  }

  // custom
  const memberShares: GroupSplitMemberShare[] = names.map((name, index) => {
    const amountCents = members[index]?.amountCents ?? 0;
    assertNonNegativeIntegerCents(amountCents, `El monto de ${name}`);
    return { name, amountCents };
  });
  const sum = memberShares.reduce((acc, share) => acc + share.amountCents, 0);
  const remaining = totalCents - sum;
  const hasExcess = remaining < 0;
  return {
    mode,
    members: memberShares,
    userShareCents: hasExcess ? 0 : remaining,
    unassignedCents: hasExcess ? 0 : remaining,
    exceededCents: hasExcess ? -remaining : 0,
    hasExcess,
  };
}
