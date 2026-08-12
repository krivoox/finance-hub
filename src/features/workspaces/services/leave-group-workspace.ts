import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  assertCanLeaveWorkspace,
  pickPreferredActiveWorkspace,
  type MembershipEntry,
  type MembershipRole,
  type WorkspaceType,
} from "@/features/workspaces/domain";
import {
  ACTIVE_WORKSPACE_COOKIE,
  setActiveWorkspaceCookie,
} from "./active-workspace";
import { requireMembership } from "./require-membership";

export type LeaveGroupWorkspaceServiceInput = {
  callerUserId: string;
  workspaceId: string;
};

export type LeaveGroupWorkspaceResult = {
  nextActiveWorkspaceId: string | null;
};

/**
 * SPEC-02 FR-07 / §5.2 — Caller removes themselves from a group workspace.
 * Prefers personal as the next active workspace when leaving the active one.
 */
export async function leaveGroupWorkspace({
  callerUserId,
  workspaceId,
}: LeaveGroupWorkspaceServiceInput): Promise<LeaveGroupWorkspaceResult> {
  await requireMembership(callerUserId, workspaceId);

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { type: true },
  });

  const rows = await prisma.membership.findMany({
    where: { workspaceId },
    select: { userId: true, role: true },
  });
  const members: MembershipEntry[] = rows.map((r) => ({
    userId: r.userId,
    role: r.role as MembershipRole,
  }));

  assertCanLeaveWorkspace(
    workspace.type as WorkspaceType,
    members,
    callerUserId,
  );

  const cookieStore = await cookies();
  const wasActive =
    cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value === workspaceId;

  await prisma.membership.delete({
    where: {
      workspaceId_userId: { workspaceId, userId: callerUserId },
    },
  });

  if (!wasActive) {
    return { nextActiveWorkspaceId: null };
  }

  const remaining = await prisma.membership.findMany({
    where: { userId: callerUserId },
    select: {
      workspace: { select: { id: true, type: true } },
    },
  });

  const nextId = pickPreferredActiveWorkspace(
    remaining.map((m) => ({
      id: m.workspace.id,
      type: m.workspace.type as WorkspaceType,
    })),
  );

  if (nextId) {
    await setActiveWorkspaceCookie(nextId);
  }

  return { nextActiveWorkspaceId: nextId };
}
