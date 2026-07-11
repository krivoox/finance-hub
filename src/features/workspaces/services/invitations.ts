import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  ForbiddenError,
  WorkspaceDomainError,
  assertCanMutateMembers,
  isInvitationExpired,
  type MembershipRole,
} from "@/features/workspaces/domain";
import { requireMembership } from "./require-membership";

/**
 * Default validity: 7 days from creation (SPEC-02 §5).
 */
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// ---------------------------------------------------------------------------
// Invite a member (SPEC-02 FR-04).
// ---------------------------------------------------------------------------

export class MemberAlreadyExistsError extends WorkspaceDomainError {
  constructor(email: string) {
    super(`User ${email} is already a member of this workspace`);
    this.name = "MemberAlreadyExistsError";
  }
}

export class InvitationAlreadyPendingError extends WorkspaceDomainError {
  constructor(email: string) {
    super(`An invitation for ${email} is already pending`);
    this.name = "InvitationAlreadyPendingError";
  }
}

export type InviteMemberServiceInput = {
  callerUserId: string;
  workspaceId: string;
  email: string;
  role: Exclude<MembershipRole, "owner">;
};

export type InvitationRecord = {
  id: string;
  workspaceId: string;
  email: string;
  role: MembershipRole;
  token: string;
  expiresAt: Date;
  status: "pending" | "accepted" | "rejected" | "expired";
};

export async function inviteMember({
  callerUserId,
  workspaceId,
  email,
  role,
}: InviteMemberServiceInput): Promise<InvitationRecord> {
  const { role: callerRole } = await requireMembership(
    callerUserId,
    workspaceId,
  );
  assertCanMutateMembers(callerRole);

  const normalizedEmail = email.trim().toLowerCase();

  // Existing user already a member?
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existingUser) {
    const existingMembership = await prisma.membership.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: existingUser.id },
      },
      select: { id: true },
    });
    if (existingMembership) {
      throw new MemberAlreadyExistsError(normalizedEmail);
    }
  }

  // Pending invitation for same email?
  const pending = await prisma.invitation.findFirst({
    where: {
      workspaceId,
      email: normalizedEmail,
      status: "pending",
    },
    select: { id: true, expiresAt: true },
  });
  if (pending && !isInvitationExpired({ expiresAt: pending.expiresAt }, new Date())) {
    throw new InvitationAlreadyPendingError(normalizedEmail);
  }

  const invitation = await prisma.invitation.create({
    data: {
      workspaceId,
      email: normalizedEmail,
      role,
      token: generateToken(),
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      invitedByUserId: callerUserId,
    },
    select: {
      id: true,
      workspaceId: true,
      email: true,
      role: true,
      token: true,
      expiresAt: true,
      status: true,
    },
  });

  return {
    id: invitation.id,
    workspaceId: invitation.workspaceId,
    email: invitation.email,
    role: invitation.role as MembershipRole,
    token: invitation.token,
    expiresAt: invitation.expiresAt,
    status: invitation.status as InvitationRecord["status"],
  };
}

// ---------------------------------------------------------------------------
// Accept an invitation (SPEC-02 FR-05 / T-05).
// ---------------------------------------------------------------------------

export class InvitationNotFoundError extends WorkspaceDomainError {
  constructor() {
    super("Invitation not found");
    this.name = "InvitationNotFoundError";
  }
}

export class InvitationExpiredError extends WorkspaceDomainError {
  constructor() {
    super("Invitation is expired or no longer active");
    this.name = "InvitationExpiredError";
  }
}

export class InvitationEmailMismatchError extends WorkspaceDomainError {
  constructor() {
    super("This invitation was sent to a different email");
    this.name = "InvitationEmailMismatchError";
  }
}

export type AcceptInvitationServiceInput = {
  userId: string;
  token: string;
};

export async function acceptInvitation({
  userId,
  token,
}: AcceptInvitationServiceInput): Promise<{ workspaceId: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) throw new ForbiddenError("User not found");

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    select: {
      id: true,
      workspaceId: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
    },
  });
  if (!invitation) throw new InvitationNotFoundError();

  if (invitation.status !== "pending") {
    throw new InvitationExpiredError();
  }
  if (isInvitationExpired({ expiresAt: invitation.expiresAt }, new Date())) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "expired" },
    });
    throw new InvitationExpiredError();
  }

  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new InvitationEmailMismatchError();
  }

  await prisma.$transaction(async (tx) => {
    await tx.membership.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
        },
      },
      update: {},
      create: {
        workspaceId: invitation.workspaceId,
        userId: user.id,
        role: invitation.role,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    });
  });

  return { workspaceId: invitation.workspaceId };
}
