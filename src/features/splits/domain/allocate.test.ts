import { describe, expect, it } from "vitest";
import {
  allocateEqual,
  allocateExact,
  allocatePercentage,
  AlreadySplitGroupMemberError,
  assertActorIsUserMember,
  assertCanCreateExpenseSplit,
  assertGhostNameAvailable,
  assertMemberCanPay,
  assertPublicShareToken,
  assertShareParticipants,
  assertUserIdAvailableInGroup,
  assertValidSettlement,
  computeMemberBalances,
  DuplicateGhostNameError,
  GhostCannotPayError,
  InvalidPercentageError,
  InvalidPublicShareTokenError,
  InvalidSettlementError,
  InvalidSplitGroupNameError,
  InvalidSplitInputError,
  normalizeSplitGroupName,
  NotSplitGroupUserMemberError,
  previewEqualSplit,
  projectPublicSplitGroup,
  SplitCurrencyMismatchError,
  SplitGroupTooSmallError,
  SplitMemberNotInGroupError,
  SplitSumMismatchError,
  type SplitGroupMemberRef,
} from "./index";

const ana: SplitGroupMemberRef = {
  memberId: "m-ana",
  kind: "user",
  userId: "user-ana",
  displayName: "Ana",
};
const juan: SplitGroupMemberRef = {
  memberId: "m-juan",
  kind: "ghost",
  userId: null,
  displayName: "Juan",
};
const bob: SplitGroupMemberRef = {
  memberId: "m-bob",
  kind: "user",
  userId: "user-bob",
  displayName: "Bob",
};

describe("allocateEqual (SPEC-10 T-01 / T-01b)", () => {
  it("splits 100 cents among a,b,c as 34,33,33", () => {
    const shares = allocateEqual(100, ["c", "a", "b"]);
    expect(shares).toEqual([
      { memberId: "a", shareCents: 34 },
      { memberId: "b", shareCents: 33 },
      { memberId: "c", shareCents: 33 },
    ]);
    expect(shares.reduce((s, x) => s + x.shareCents, 0)).toBe(100);
  });

  it("always sums to total (property)", () => {
    for (const total of [1, 2, 3, 99, 101, 1000]) {
      const ids = ["u1", "u2", "u3", "u4"];
      const shares = allocateEqual(total, ids);
      expect(shares.reduce((s, x) => s + x.shareCents, 0)).toBe(total);
    }
  });
});

describe("allocateExact (SPEC-10 T-02 / T-03 / T-03b)", () => {
  it("accepts exact shares that sum to total", () => {
    expect(
      allocateExact(1000, [
        { memberId: "a", cents: 600 },
        { memberId: "b", cents: 400 },
      ]),
    ).toEqual([
      { memberId: "a", shareCents: 600 },
      { memberId: "b", shareCents: 400 },
    ]);
  });

  it("rejects mismatch", () => {
    expect(() =>
      allocateExact(1000, [
        { memberId: "a", cents: 600 },
        { memberId: "b", cents: 300 },
      ]),
    ).toThrow(SplitSumMismatchError);
  });

  it("rejects negative share cents", () => {
    expect(() =>
      allocateExact(100, [
        { memberId: "a", cents: -1 },
        { memberId: "b", cents: 101 },
      ]),
    ).toThrow(InvalidSplitInputError);
  });

  it("rejects all-zero shares", () => {
    expect(() =>
      allocateExact(0, [
        { memberId: "a", cents: 0 },
        { memberId: "b", cents: 0 },
      ]),
    ).toThrow(InvalidSplitInputError);
  });
});

describe("allocatePercentage (SPEC-10 T-04 / T-04b)", () => {
  it("50/50 over 101 sums to 101 with remainder rule", () => {
    const shares = allocatePercentage(101, [
      { memberId: "b", percent: 50 },
      { memberId: "a", percent: 50 },
    ]);
    expect(shares.reduce((s, x) => s + x.shareCents, 0)).toBe(101);
    expect(shares).toEqual([
      { memberId: "a", shareCents: 51 },
      { memberId: "b", shareCents: 50 },
    ]);
  });

  it("rejects percent sum !== 100", () => {
    expect(() =>
      allocatePercentage(100, [
        { memberId: "a", percent: 40 },
        { memberId: "b", percent: 40 },
      ]),
    ).toThrow(InvalidPercentageError);
  });
});

describe("computeMemberBalances (SPEC-10 T-05 / T-06 / T-06b)", () => {
  it("Ana pays 9000 equal Ana+Juan ghost → Juan owes Ana 4500", () => {
    const shares = allocateEqual(9000, [ana.memberId, juan.memberId]);
    const balances = computeMemberBalances(
      [{ paidByMemberId: ana.memberId, shares }],
      [],
      [ana.memberId, juan.memberId],
    );
    expect(balances).toEqual([
      { memberId: ana.memberId, netCents: 4500 },
      { memberId: juan.memberId, netCents: -4500 },
    ]);
  });

  it("settlement Juan→Ana 4500 zeros the pair", () => {
    const shares = allocateEqual(9000, [ana.memberId, juan.memberId]);
    const balances = computeMemberBalances(
      [{ paidByMemberId: ana.memberId, shares }],
      [
        {
          fromMemberId: juan.memberId,
          toMemberId: ana.memberId,
          amountCents: 4500,
        },
      ],
      [ana.memberId, juan.memberId],
    );
    expect(balances).toEqual([
      { memberId: ana.memberId, netCents: 0 },
      { memberId: juan.memberId, netCents: 0 },
    ]);
  });

  it("rejects settlement from = to", () => {
    expect(() =>
      assertValidSettlement({
        fromMemberId: ana.memberId,
        toMemberId: ana.memberId,
        amountCents: 100,
        currentMemberIds: [ana.memberId, juan.memberId],
      }),
    ).toThrow(InvalidSettlementError);
  });

  it("rejects settlement amount 0", () => {
    expect(() =>
      assertValidSettlement({
        fromMemberId: juan.memberId,
        toMemberId: ana.memberId,
        amountCents: 0,
        currentMemberIds: [ana.memberId, juan.memberId],
      }),
    ).toThrow(InvalidSettlementError);
  });

  it("rejects settlement party not in the group", () => {
    expect(() =>
      assertValidSettlement({
        fromMemberId: "m-pepe",
        toMemberId: ana.memberId,
        amountCents: 100,
        currentMemberIds: [ana.memberId, juan.memberId],
      }),
    ).toThrow(SplitMemberNotInGroupError);
  });
});

describe("assertCanCreateExpenseSplit (SPEC-10 T-07 personal happy)", () => {
  it("allows a split on a personal workspace SplitGroup", () => {
    const result = assertCanCreateExpenseSplit({
      group: { currency: "ARS", workspaceId: "ws-ana" },
      currentMembers: [ana, juan],
      registrarUserId: ana.userId!,
      registrarPersonalWorkspaceId: "ws-ana",
      expense: {
        type: "expense",
        amountCents: 10000,
        currency: "ARS",
        workspaceId: "ws-ana",
      },
      method: "equal",
      shareMemberIds: [ana.memberId, juan.memberId],
    });
    expect(result.paidByMemberId).toBe(ana.memberId);
  });
});

describe("ghost members (SPEC-10 T-08 / T-20)", () => {
  it("ghost without userId participates in equal and nets", () => {
    const shares = allocateEqual(9000, [ana.memberId, juan.memberId]);
    const balances = computeMemberBalances(
      [{ paidByMemberId: ana.memberId, shares }],
      [],
      [ana.memberId, juan.memberId],
    );
    expect(juan.userId).toBeNull();
    expect(balances.find((b) => b.memberId === juan.memberId)?.netCents).toBe(
      -4500,
    );
  });

  it("assertMemberCanPay(ghost) throws GhostCannotPayError", () => {
    expect(() => assertMemberCanPay(juan)).toThrow(GhostCannotPayError);
  });
});

describe("payer in another personal workspace (SPEC-10 T-09)", () => {
  it("Bob records the expense in his own ledger", () => {
    const result = assertCanCreateExpenseSplit({
      group: { currency: "ARS", workspaceId: "ws-ana" },
      currentMembers: [ana, bob],
      registrarUserId: bob.userId!,
      registrarPersonalWorkspaceId: "ws-bob",
      expense: {
        type: "expense",
        amountCents: 5000,
        currency: "ARS",
        workspaceId: "ws-bob",
      },
      method: "equal",
      shareMemberIds: [ana.memberId, bob.memberId],
    });
    expect(result.paidByMemberId).toBe(bob.memberId);
  });

  it("rejects writing Ana's ledger from Bob", () => {
    expect(() =>
      assertCanCreateExpenseSplit({
        group: { currency: "ARS", workspaceId: "ws-ana" },
        currentMembers: [ana, bob],
        registrarUserId: bob.userId!,
        registrarPersonalWorkspaceId: "ws-bob",
        expense: {
          type: "expense",
          amountCents: 5000,
          currency: "ARS",
          workspaceId: "ws-ana",
        },
        method: "equal",
        shareMemberIds: [ana.memberId, bob.memberId],
      }),
    ).toThrow(InvalidSplitInputError);
  });

  it("rejects a registrar who is not a user member", () => {
    expect(() =>
      assertCanCreateExpenseSplit({
        group: { currency: "ARS", workspaceId: "ws-ana" },
        currentMembers: [ana, juan],
        registrarUserId: "user-carl",
        registrarPersonalWorkspaceId: "ws-carl",
        expense: {
          type: "expense",
          amountCents: 5000,
          currency: "ARS",
          workspaceId: "ws-carl",
        },
        method: "equal",
        shareMemberIds: [ana.memberId, juan.memberId],
      }),
    ).toThrow(NotSplitGroupUserMemberError);
  });
});

describe("cascade delete of expense (SPEC-10 T-10)", () => {
  it("recomputing without the split zeros nets; leftover settlement still counts", () => {
    const afterDelete = computeMemberBalances(
      [],
      [],
      [ana.memberId, juan.memberId],
    );
    expect(afterDelete).toEqual([
      { memberId: ana.memberId, netCents: 0 },
      { memberId: juan.memberId, netCents: 0 },
    ]);

    const withOrphanSettlement = computeMemberBalances(
      [],
      [
        {
          fromMemberId: juan.memberId,
          toMemberId: ana.memberId,
          amountCents: 1000,
        },
      ],
      [ana.memberId, juan.memberId],
    );
    expect(withOrphanSettlement).toEqual([
      { memberId: ana.memberId, netCents: -1000 },
      { memberId: juan.memberId, netCents: 1000 },
    ]);
  });
});

describe("share participants (SPEC-10 T-11 / T-19)", () => {
  it("rejects equal subset", () => {
    expect(() =>
      assertShareParticipants({
        method: "equal",
        currentMemberIds: [ana.memberId, juan.memberId],
        shareMemberIds: [ana.memberId],
      }),
    ).toThrow(InvalidSplitInputError);
  });

  it("rejects unknown member id", () => {
    expect(() =>
      assertShareParticipants({
        method: "equal",
        currentMemberIds: [ana.memberId, juan.memberId],
        shareMemberIds: [ana.memberId, "m-pepe"],
      }),
    ).toThrow(SplitMemberNotInGroupError);
  });

  it("rejects duplicate ids", () => {
    expect(() =>
      assertShareParticipants({
        method: "equal",
        currentMemberIds: [ana.memberId, juan.memberId],
        shareMemberIds: [ana.memberId, ana.memberId],
      }),
    ).toThrow(InvalidSplitInputError);
  });

  it("rejects exact share for a non-member", () => {
    expect(() =>
      assertShareParticipants({
        method: "exact",
        currentMemberIds: [ana.memberId, juan.memberId],
        shareMemberIds: ["m-pepe"],
      }),
    ).toThrow(SplitMemberNotInGroupError);
  });

  it("rejects a group with a single member", () => {
    expect(() =>
      assertCanCreateExpenseSplit({
        group: { currency: "ARS", workspaceId: "ws-ana" },
        currentMembers: [ana],
        registrarUserId: ana.userId!,
        registrarPersonalWorkspaceId: "ws-ana",
        expense: {
          type: "expense",
          amountCents: 1000,
          currency: "ARS",
          workspaceId: "ws-ana",
        },
        method: "equal",
        shareMemberIds: [ana.memberId],
      }),
    ).toThrow(SplitGroupTooSmallError);
  });
});

describe("previewEqualSplit (SPEC-10 T-12)", () => {
  it("matches allocateEqual for 100 / 3 with payer a", () => {
    const allocated = allocateEqual(100, ["a", "b", "c"]);
    const preview = previewEqualSplit({
      totalCents: 100,
      memberIds: ["a", "b", "c"],
      payerMemberId: "a",
    });
    expect(preview.shares).toEqual(allocated);
    expect(preview.baseCents).toBe(33);
    expect(preview.remainderCents).toBe(1);
    expect(preview.payerShareCents).toBe(34);
    expect(preview.othersOwePayerCents).toBe(66);
    expect(preview.participantCount).toBe(3);
  });

  it("two members of 10000 → 5000 each, others owe 5000", () => {
    const preview = previewEqualSplit({
      totalCents: 10000,
      memberIds: ["a", "b"],
      payerMemberId: "a",
    });
    expect(preview.shares.map((s) => s.shareCents)).toEqual([5000, 5000]);
    expect(preview.othersOwePayerCents).toBe(5000);
  });
});

describe("split group name (SPEC-10 T-13)", () => {
  it("trims a valid name", () => {
    expect(normalizeSplitGroupName("  Casa  ")).toBe("Casa");
  });

  it("rejects blank names", () => {
    expect(() => normalizeSplitGroupName("   ")).toThrow(
      InvalidSplitGroupNameError,
    );
    expect(() => normalizeSplitGroupName("")).toThrow(
      InvalidSplitGroupNameError,
    );
  });
});

describe("ghost uniqueness (SPEC-10 T-14)", () => {
  it("rejects a duplicate ghost name ignoring case and trim", () => {
    expect(() =>
      assertGhostNameAvailable({
        existingGhostKeys: ["juan"],
        rawName: " juan ",
      }),
    ).toThrow(DuplicateGhostNameError);
    expect(() =>
      assertGhostNameAvailable({
        existingGhostKeys: ["juan"],
        rawName: "JUAN",
      }),
    ).toThrow(DuplicateGhostNameError);
  });

  it("accepts a distinct name", () => {
    expect(
      assertGhostNameAvailable({
        existingGhostKeys: ["juan"],
        rawName: "Juana",
      }),
    ).toBe("Juana");
  });
});

describe("userId uniqueness (SPEC-10 T-15)", () => {
  it("rejects a user already in the group", () => {
    expect(() =>
      assertUserIdAvailableInGroup({
        existingUserIds: ["user-bob"],
        userId: "user-bob",
      }),
    ).toThrow(AlreadySplitGroupMemberError);
  });

  it("accepts a new userId", () => {
    expect(() =>
      assertUserIdAvailableInGroup({
        existingUserIds: ["user-bob"],
        userId: "user-carl",
      }),
    ).not.toThrow();
  });
});

describe("public projection (SPEC-10 T-16)", () => {
  it("exposes names and nets without userId, memberId or workspaceId", () => {
    const shares = allocateEqual(9000, [ana.memberId, juan.memberId]);
    const balances = computeMemberBalances(
      [{ paidByMemberId: ana.memberId, shares }],
      [],
      [ana.memberId, juan.memberId],
    );
    const projection = projectPublicSplitGroup({
      name: "Casa",
      members: [ana, juan],
      balances,
      activity: [
        {
          description: "Asado",
          amountCents: 9000,
          paidByMemberId: ana.memberId,
        },
      ],
    });
    const serialized = JSON.stringify(projection);
    expect(serialized).not.toContain("user-ana");
    expect(serialized).not.toContain("m-ana");
    expect(serialized).not.toContain("workspace");
    expect(projection.members.map((m) => m.displayName)).toEqual([
      "Ana",
      "Juan",
    ]);
    expect(projection.activity[0]).toEqual({
      description: "Asado",
      amountCents: 9000,
      paidByDisplayName: "Ana",
    });
  });

  it("rejects an empty or mismatched public token", () => {
    expect(() => assertPublicShareToken("", "tok")).toThrow(
      InvalidPublicShareTokenError,
    );
    expect(() => assertPublicShareToken("nope", "tok")).toThrow(
      InvalidPublicShareTokenError,
    );
  });
});

describe("currency mismatch (SPEC-10 T-17)", () => {
  it("rejects USD expense on an ARS group", () => {
    expect(() =>
      assertCanCreateExpenseSplit({
        group: { currency: "ARS", workspaceId: "ws-ana" },
        currentMembers: [ana, juan],
        registrarUserId: ana.userId!,
        registrarPersonalWorkspaceId: "ws-ana",
        expense: {
          type: "expense",
          amountCents: 1000,
          currency: "USD",
          workspaceId: "ws-ana",
        },
        method: "equal",
        shareMemberIds: [ana.memberId, juan.memberId],
      }),
    ).toThrow(SplitCurrencyMismatchError);
  });
});

describe("non user-member (SPEC-10 T-18)", () => {
  it("Eve is not a user member", () => {
    expect(() =>
      assertActorIsUserMember({
        members: [ana, juan],
        userId: "user-eve",
      }),
    ).toThrow(NotSplitGroupUserMemberError);
  });
});
