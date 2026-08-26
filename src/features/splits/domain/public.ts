import { InvalidPublicShareTokenError } from "./errors";
import type {
  MemberBalance,
  PublicSplitGroupProjection,
  SplitGroupMemberRef,
} from "./types";

export function assertPublicShareToken(token: string, expected: string): void {
  if (!token || !expected || token !== expected) {
    throw new InvalidPublicShareTokenError();
  }
}

export function projectPublicSplitGroup(input: {
  name: string;
  members: readonly SplitGroupMemberRef[];
  balances: readonly MemberBalance[];
  activity: readonly {
    description: string | null;
    amountCents: number;
    paidByMemberId: string;
  }[];
}): PublicSplitGroupProjection {
  const nameByMemberId = new Map(
    input.members.map((m) => [m.memberId, m.displayName]),
  );
  const netByMemberId = new Map(
    input.balances.map((b) => [b.memberId, b.netCents]),
  );

  return {
    name: input.name,
    members: input.members.map((m) => ({
      displayName: m.displayName,
      netCents: netByMemberId.get(m.memberId) ?? 0,
    })),
    activity: input.activity.map((item) => ({
      description: item.description,
      amountCents: item.amountCents,
      paidByDisplayName: nameByMemberId.get(item.paidByMemberId) ?? "Unknown",
    })),
  };
}
