import type { SplitGroupMember, SplitGroup } from "@/generated/prisma/client";
import type { SplitGroupMemberRef } from "@/features/splits/domain";

export type SplitGroupMemberRow = Pick<
  SplitGroupMember,
  "id" | "kind" | "userId" | "displayName"
>;

export function toMemberRef(row: SplitGroupMemberRow): SplitGroupMemberRef {
  return {
    memberId: row.id,
    kind: row.kind === "ghost" ? "ghost" : "user",
    userId: row.userId,
    displayName: row.displayName,
  };
}

export type SplitGroupWithMembers = SplitGroup & {
  members: SplitGroupMember[];
};

export function memberDisplayName(user: {
  displayName: string | null;
  name: string;
  email?: string;
}): string {
  const display = user.displayName?.trim();
  if (display) return display;
  const name = user.name.trim();
  if (name) return name;
  return user.email?.trim() || "Sin nombre";
}
