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

export const SPLIT_NAME_MAX_LENGTH = 80;

/** Same synthetic bucket as SPEC-11 analytics. Never a real category id. */
export const SPLIT_UNCATEGORIZED_CATEGORY_ID = "_uncategorized";
export const SPLIT_UNCATEGORIZED_CATEGORY_NAME = "Sin categoría";

export type SplitExpenseForCategory = {
  amountCents: number;
  categoryId: string | null;
  categoryName: string | null;
};

export type SplitCategorySpendingRow = {
  categoryId: string;
  categoryName: string;
  amountCents: number;
  transactionCount: number;
};
