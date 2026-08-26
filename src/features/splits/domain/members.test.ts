import { describe, expect, it } from "vitest";
import {
  CannotRemoveGroupCreatorError,
  ForbiddenSplitGroupActionError,
  MemberHasSplitHistoryError,
  assertCanDeleteSplitGroup,
  assertCanRemoveMember,
  assertCanRenameMember,
  assertCanRenameSplitGroup,
  canRemoveMember,
  canRenameMember,
  memberHasLedgerHistory,
} from "./index";
import type { SplitGroupMemberRef } from "./types";

const ana: SplitGroupMemberRef = {
  memberId: "m-ana",
  kind: "user",
  userId: "user-ana",
  displayName: "Ana",
};
const bob: SplitGroupMemberRef = {
  memberId: "m-bob",
  kind: "user",
  userId: "user-bob",
  displayName: "Bob",
};
const carl: SplitGroupMemberRef = {
  memberId: "m-carl",
  kind: "user",
  userId: "user-carl",
  displayName: "Carl",
};
const juan: SplitGroupMemberRef = {
  memberId: "m-juan",
  kind: "ghost",
  userId: null,
  displayName: "Juan",
};

describe("assertCanRenameSplitGroup / assertCanDeleteSplitGroup (SPEC-10 T-21)", () => {
  it("allows the creator", () => {
    const input = { createdByUserId: "user-ana", actorUserId: "user-ana" };
    expect(() => assertCanRenameSplitGroup(input)).not.toThrow();
    expect(() => assertCanDeleteSplitGroup(input)).not.toThrow();
  });

  it("rejects another user member", () => {
    const input = { createdByUserId: "user-ana", actorUserId: "user-bob" };
    expect(() => assertCanRenameSplitGroup(input)).toThrow(
      ForbiddenSplitGroupActionError,
    );
    expect(() => assertCanDeleteSplitGroup(input)).toThrow(
      ForbiddenSplitGroupActionError,
    );
  });
});

describe("assertCanRenameMember (SPEC-10 T-22)", () => {
  const base = {
    actorUserId: "user-bob",
    createdByUserId: "user-ana",
    actorMemberId: bob.memberId,
  };

  it("lets any user member rename a ghost", () => {
    expect(() => assertCanRenameMember({ ...base, target: juan })).not.toThrow();
    expect(canRenameMember({ ...base, target: juan })).toBe(true);
  });

  it("lets a user rename themselves", () => {
    expect(() => assertCanRenameMember({ ...base, target: bob })).not.toThrow();
  });

  it("lets the creator rename another user", () => {
    expect(() =>
      assertCanRenameMember({
        actorUserId: "user-ana",
        createdByUserId: "user-ana",
        actorMemberId: ana.memberId,
        target: bob,
      }),
    ).not.toThrow();
  });

  it("rejects renaming another user when the actor is not the creator", () => {
    expect(() =>
      assertCanRenameMember({
        actorUserId: "user-carl",
        createdByUserId: "user-ana",
        actorMemberId: carl.memberId,
        target: bob,
      }),
    ).toThrow(ForbiddenSplitGroupActionError);
    expect(
      canRenameMember({
        actorUserId: "user-carl",
        createdByUserId: "user-ana",
        actorMemberId: carl.memberId,
        target: bob,
      }),
    ).toBe(false);
  });
});

describe("memberHasLedgerHistory / assertCanRemoveMember (SPEC-10 T-23)", () => {
  it("is true when the member paid, has a share, or a settlement", () => {
    expect(
      memberHasLedgerHistory({
        memberId: "m-juan",
        paidSplitMemberIds: ["m-ana"],
        shareMemberIds: ["m-juan"],
        settlementMemberIds: [],
      }),
    ).toBe(true);
    expect(
      memberHasLedgerHistory({
        memberId: "m-juan",
        paidSplitMemberIds: ["m-juan"],
        shareMemberIds: [],
        settlementMemberIds: [],
      }),
    ).toBe(true);
    expect(
      memberHasLedgerHistory({
        memberId: "m-juan",
        paidSplitMemberIds: [],
        shareMemberIds: [],
        settlementMemberIds: ["m-ana", "m-juan"],
      }),
    ).toBe(true);
    expect(
      memberHasLedgerHistory({
        memberId: "m-juan",
        paidSplitMemberIds: ["m-ana"],
        shareMemberIds: ["m-ana"],
        settlementMemberIds: ["m-ana", "m-bob"],
      }),
    ).toBe(false);
  });

  it("lets a user member remove a ghost without history", () => {
    expect(() =>
      assertCanRemoveMember({
        actorUserId: "user-bob",
        createdByUserId: "user-ana",
        actorMemberId: bob.memberId,
        target: juan,
        hasLedgerHistory: false,
      }),
    ).not.toThrow();
    expect(
      canRemoveMember({
        actorUserId: "user-bob",
        createdByUserId: "user-ana",
        actorMemberId: bob.memberId,
        target: juan,
        hasLedgerHistory: false,
      }),
    ).toBe(true);
  });

  it("lets a non-creator leave when they have no history", () => {
    expect(() =>
      assertCanRemoveMember({
        actorUserId: "user-bob",
        createdByUserId: "user-ana",
        actorMemberId: bob.memberId,
        target: bob,
        hasLedgerHistory: false,
      }),
    ).not.toThrow();
  });

  it("lets the creator remove another user without history", () => {
    expect(() =>
      assertCanRemoveMember({
        actorUserId: "user-ana",
        createdByUserId: "user-ana",
        actorMemberId: ana.memberId,
        target: bob,
        hasLedgerHistory: false,
      }),
    ).not.toThrow();
  });

  it("rejects removing a member with split history", () => {
    expect(() =>
      assertCanRemoveMember({
        actorUserId: "user-ana",
        createdByUserId: "user-ana",
        actorMemberId: ana.memberId,
        target: juan,
        hasLedgerHistory: true,
      }),
    ).toThrow(MemberHasSplitHistoryError);
    expect(
      canRemoveMember({
        actorUserId: "user-ana",
        createdByUserId: "user-ana",
        actorMemberId: ana.memberId,
        target: juan,
        hasLedgerHistory: true,
      }),
    ).toBe(false);
  });

  it("rejects removing the creator", () => {
    expect(() =>
      assertCanRemoveMember({
        actorUserId: "user-ana",
        createdByUserId: "user-ana",
        actorMemberId: ana.memberId,
        target: ana,
        hasLedgerHistory: false,
      }),
    ).toThrow(CannotRemoveGroupCreatorError);
  });

  it("rejects removing another user when the actor is not the creator", () => {
    expect(() =>
      assertCanRemoveMember({
        actorUserId: "user-carl",
        createdByUserId: "user-ana",
        actorMemberId: carl.memberId,
        target: bob,
        hasLedgerHistory: false,
      }),
    ).toThrow(ForbiddenSplitGroupActionError);
  });
});
