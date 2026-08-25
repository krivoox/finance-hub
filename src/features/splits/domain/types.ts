export type SplitShare = {
  memberId: string;
  shareCents: number;
};

export type SplitGroupMemberRef = {
  memberId: string;
  kind: "user" | "ghost";
  userId: string | null;
  displayName: string;
};

export type SplitForBalance = {
  paidByMemberId: string;
  shares: readonly SplitShare[];
};

export type SettlementForBalance = {
  fromMemberId: string;
  toMemberId: string;
  amountCents: number;
};

export type MemberBalance = {
  memberId: string;
  netCents: number;
};

export type EqualSplitPreview = {
  shares: SplitShare[];
  participantCount: number;
  baseCents: number;
  remainderCents: number;
  payerMemberId: string;
  payerShareCents: number;
  othersOwePayerCents: number;
};

export type PublicSplitActivityItem = {
  description: string | null;
  amountCents: number;
  paidByDisplayName: string;
};

export type PublicSplitGroupProjection = {
  name: string;
  members: { displayName: string; netCents: number }[];
  activity: PublicSplitActivityItem[];
};

export type SplitMethod = "equal" | "percentage" | "exact";
export type SplitGroupKind = "ongoing" | "one_time";

export const SPLIT_NAME_MAX_LENGTH = 80;
