import { describe, expect, it } from "vitest";
import {
  CannotDeletePersonal,
  CannotLeaveAsLastOwner,
  CannotLeavePersonal,
  CannotRemoveLastOwner,
  ConfirmationNameMismatch,
  ForbiddenError,
  InvalidTransferError,
  WorkspaceHasCrossLinks,
  applyTransferOwnership,
  assertCanDeleteGroupWorkspace,
  assertCanLeaveWorkspace,
  assertCanMutateMembers,
  assertCanRename,
  assertCanTransferOwnership,
  assertConfirmationNameMatches,
  assertNoCrossWorkspaceInvolvement,
  assertNotRemovingLastOwner,
  isInvitationExpired,
  pickPreferredActiveWorkspace,
  type MembershipEntry,
} from "./membership";

const OWNER = { userId: "u-owner", role: "owner" } as const;
const ADMIN = { userId: "u-admin", role: "admin" } as const;
const MEMBER = { userId: "u-member", role: "member" } as const;
const VIEWER = { userId: "u-viewer", role: "viewer" } as const;

const asMembers = (...entries: MembershipEntry[]): MembershipEntry[] => entries;

describe("Workspaces domain — authz predicates (SPEC-02 §5)", () => {
  describe("assertCanMutateMembers (owner/admin only)", () => {
    it("allows owner and admin", () => {
      expect(() => assertCanMutateMembers("owner")).not.toThrow();
      expect(() => assertCanMutateMembers("admin")).not.toThrow();
    });

    it("throws Forbidden for member and viewer", () => {
      expect(() => assertCanMutateMembers("member")).toThrow(ForbiddenError);
      expect(() => assertCanMutateMembers("viewer")).toThrow(ForbiddenError);
    });
  });

  describe("assertCanTransferOwnership (owner only)", () => {
    it("allows only owner", () => {
      expect(() => assertCanTransferOwnership("owner")).not.toThrow();
    });

    it("throws Forbidden for admin/member/viewer", () => {
      expect(() => assertCanTransferOwnership("admin")).toThrow(ForbiddenError);
      expect(() => assertCanTransferOwnership("member")).toThrow(
        ForbiddenError,
      );
      expect(() => assertCanTransferOwnership("viewer")).toThrow(
        ForbiddenError,
      );
    });
  });

  describe("assertCanRename (owner/admin) — T-04: viewer cannot mutate", () => {
    it("allows owner and admin", () => {
      expect(() => assertCanRename("owner")).not.toThrow();
      expect(() => assertCanRename("admin")).not.toThrow();
    });

    it("throws Forbidden for viewer (SPEC-02 T-04)", () => {
      expect(() => assertCanRename("viewer")).toThrow(ForbiddenError);
    });

    it("throws Forbidden for member", () => {
      expect(() => assertCanRename("member")).toThrow(ForbiddenError);
    });
  });
});

describe("Workspaces domain — last-owner protection (SPEC-02 T-02)", () => {
  it("throws CannotRemoveLastOwner when removing the sole owner", () => {
    const members = asMembers(OWNER, MEMBER);
    expect(() =>
      assertNotRemovingLastOwner(members, OWNER.userId),
    ).toThrow(CannotRemoveLastOwner);
  });

  it("allows removing an owner when another owner remains", () => {
    const secondOwner = { userId: "u-owner-2", role: "owner" } as const;
    const members = asMembers(OWNER, secondOwner, MEMBER);
    expect(() =>
      assertNotRemovingLastOwner(members, OWNER.userId),
    ).not.toThrow();
  });

  it("allows removing a non-owner regardless", () => {
    const members = asMembers(OWNER, MEMBER);
    expect(() =>
      assertNotRemovingLastOwner(members, MEMBER.userId),
    ).not.toThrow();
  });

  it("throws if userIdToRemove is not a member (safety)", () => {
    const members = asMembers(OWNER, MEMBER);
    expect(() =>
      assertNotRemovingLastOwner(members, "u-does-not-exist"),
    ).toThrow();
  });
});

describe("Workspaces domain — transfer ownership (SPEC-02 T-03)", () => {
  it("swaps owner→admin and target→owner (rule fixed: A becomes admin)", () => {
    const members = asMembers(OWNER, MEMBER);
    const next = applyTransferOwnership(members, OWNER.userId, MEMBER.userId);

    const byId = Object.fromEntries(next.map((m) => [m.userId, m.role]));
    expect(byId[OWNER.userId]).toBe("admin");
    expect(byId[MEMBER.userId]).toBe("owner");
  });

  it("promotes an admin target to owner and demotes previous owner to admin", () => {
    const members = asMembers(OWNER, ADMIN, MEMBER);
    const next = applyTransferOwnership(members, OWNER.userId, ADMIN.userId);
    const byId = Object.fromEntries(next.map((m) => [m.userId, m.role]));
    expect(byId[ADMIN.userId]).toBe("owner");
    expect(byId[OWNER.userId]).toBe("admin");
    expect(byId[MEMBER.userId]).toBe("member");
  });

  it("preserves membership order (stable)", () => {
    const members = asMembers(OWNER, ADMIN, MEMBER);
    const next = applyTransferOwnership(members, OWNER.userId, MEMBER.userId);
    expect(next.map((m) => m.userId)).toEqual([
      OWNER.userId,
      ADMIN.userId,
      MEMBER.userId,
    ]);
  });

  it("throws InvalidTransferError when fromUser is not currently owner", () => {
    const members = asMembers(OWNER, ADMIN);
    expect(() =>
      applyTransferOwnership(members, ADMIN.userId, OWNER.userId),
    ).toThrow(InvalidTransferError);
  });

  it("throws InvalidTransferError when toUser is not a member", () => {
    const members = asMembers(OWNER, ADMIN);
    expect(() =>
      applyTransferOwnership(members, OWNER.userId, "u-outsider"),
    ).toThrow(InvalidTransferError);
  });

  it("throws when transferring to self (no-op)", () => {
    const members = asMembers(OWNER, ADMIN);
    expect(() =>
      applyTransferOwnership(members, OWNER.userId, OWNER.userId),
    ).toThrow(InvalidTransferError);
  });

  it("does not mutate the input list", () => {
    const members = asMembers(OWNER, MEMBER);
    const snapshot = JSON.stringify(members);
    applyTransferOwnership(members, OWNER.userId, MEMBER.userId);
    expect(JSON.stringify(members)).toBe(snapshot);
  });

  it("does not affect viewers", () => {
    const members = asMembers(OWNER, MEMBER, VIEWER);
    const next = applyTransferOwnership(members, OWNER.userId, MEMBER.userId);
    const byId = Object.fromEntries(next.map((m) => [m.userId, m.role]));
    expect(byId[VIEWER.userId]).toBe("viewer");
  });
});

describe("Workspaces domain — leave (SPEC-02 §5.2)", () => {
  describe("assertCanLeaveWorkspace — T-10 personal", () => {
    it("throws CannotLeavePersonal for personal workspace", () => {
      const members = asMembers(OWNER);
      expect(() =>
        assertCanLeaveWorkspace("personal", members, OWNER.userId),
      ).toThrow(CannotLeavePersonal);
    });
  });

  describe("assertCanLeaveWorkspace — T-09 last owner", () => {
    it("throws CannotLeaveAsLastOwner when sole owner leaves a group", () => {
      const members = asMembers(OWNER, MEMBER);
      expect(() =>
        assertCanLeaveWorkspace("group", members, OWNER.userId),
      ).toThrow(CannotLeaveAsLastOwner);
    });

    it("allows owner leave when another owner remains", () => {
      const secondOwner = { userId: "u-owner-2", role: "owner" } as const;
      const members = asMembers(OWNER, secondOwner);
      expect(() =>
        assertCanLeaveWorkspace("group", members, OWNER.userId),
      ).not.toThrow();
    });
  });

  describe("assertCanLeaveWorkspace — T-08 happy path roles", () => {
    it("allows member/admin/viewer to leave a group", () => {
      const members = asMembers(OWNER, ADMIN, MEMBER, VIEWER);
      expect(() =>
        assertCanLeaveWorkspace("group", members, MEMBER.userId),
      ).not.toThrow();
      expect(() =>
        assertCanLeaveWorkspace("group", members, ADMIN.userId),
      ).not.toThrow();
      expect(() =>
        assertCanLeaveWorkspace("group", members, VIEWER.userId),
      ).not.toThrow();
    });
  });
});

describe("Workspaces domain — delete group (SPEC-02 §5.3)", () => {
  describe("assertCanDeleteGroupWorkspace — T-14 personal", () => {
    it("throws CannotDeletePersonal regardless of role", () => {
      expect(() => assertCanDeleteGroupWorkspace("owner", "personal")).toThrow(
        CannotDeletePersonal,
      );
      expect(() => assertCanDeleteGroupWorkspace("admin", "personal")).toThrow(
        CannotDeletePersonal,
      );
    });
  });

  describe("assertCanDeleteGroupWorkspace — T-15 non-owner", () => {
    it("throws Forbidden for admin/member/viewer on a group", () => {
      expect(() => assertCanDeleteGroupWorkspace("admin", "group")).toThrow(
        ForbiddenError,
      );
      expect(() => assertCanDeleteGroupWorkspace("member", "group")).toThrow(
        ForbiddenError,
      );
      expect(() => assertCanDeleteGroupWorkspace("viewer", "group")).toThrow(
        ForbiddenError,
      );
    });

    it("allows owner on a group", () => {
      expect(() =>
        assertCanDeleteGroupWorkspace("owner", "group"),
      ).not.toThrow();
    });
  });

  describe("assertNoCrossWorkspaceInvolvement — T-12/T-13 predicates", () => {
    it("throws WorkspaceHasCrossLinks when involvement is true", () => {
      expect(() => assertNoCrossWorkspaceInvolvement(true)).toThrow(
        WorkspaceHasCrossLinks,
      );
    });

    it("allows delete when involvement is false", () => {
      expect(() => assertNoCrossWorkspaceInvolvement(false)).not.toThrow();
    });
  });

  describe("assertConfirmationNameMatches — FR-13", () => {
    it("passes when names match exactly", () => {
      expect(() =>
        assertConfirmationNameMatches("Hogar", "Hogar"),
      ).not.toThrow();
    });

    it("throws ConfirmationNameMismatch on mismatch", () => {
      expect(() =>
        assertConfirmationNameMatches("Hogar", "hogar"),
      ).toThrow(ConfirmationNameMismatch);
      expect(() =>
        assertConfirmationNameMatches("Hogar", "Hogar "),
      ).toThrow(ConfirmationNameMismatch);
    });
  });
});

describe("Workspaces domain — pickPreferredActiveWorkspace (SPEC-02 T-17)", () => {
  it("prefers personal regardless of order", () => {
    const remaining = [
      { id: "g-h", type: "group" as const },
      { id: "p", type: "personal" as const },
    ];
    expect(pickPreferredActiveWorkspace(remaining)).toBe("p");
  });

  it("returns personal when it is first", () => {
    const remaining = [
      { id: "p", type: "personal" as const },
      { id: "g-h", type: "group" as const },
    ];
    expect(pickPreferredActiveWorkspace(remaining)).toBe("p");
  });

  it("returns first remaining group when no personal", () => {
    const remaining = [
      { id: "g-a", type: "group" as const },
      { id: "g-b", type: "group" as const },
    ];
    expect(pickPreferredActiveWorkspace(remaining)).toBe("g-a");
  });

  it("returns null when remaining is empty", () => {
    expect(pickPreferredActiveWorkspace([])).toBeNull();
  });
});

describe("Workspaces domain — invitation expiry", () => {
  const now = new Date("2026-07-10T12:00:00.000Z");

  it("returns false while expiresAt is in the future", () => {
    const inv = { expiresAt: new Date("2026-07-11T12:00:00.000Z") };
    expect(isInvitationExpired(inv, now)).toBe(false);
  });

  it("returns true when expiresAt is strictly in the past", () => {
    const inv = { expiresAt: new Date("2026-07-10T11:59:59.999Z") };
    expect(isInvitationExpired(inv, now)).toBe(true);
  });

  it("returns true at the exact instant expiresAt is reached (inclusive)", () => {
    const inv = { expiresAt: new Date(now) };
    expect(isInvitationExpired(inv, now)).toBe(true);
  });
});
