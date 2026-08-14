import { describe, expect, it } from "vitest";
import {
  assertCanContribute,
  assertCanMutateContributionTwin,
  SameWorkspaceContributionError,
} from "./contribution";
import {
  AccountArchivedError,
  TransactionCurrencyMismatchError,
} from "./errors";
import { ForbiddenError } from "@/features/workspaces/domain";

const source = {
  id: "acc-visa",
  workspaceId: "ws-personal",
  currency: "ARS",
  isArchived: false,
};

const target = {
  id: "acc-casa",
  workspaceId: "ws-casa",
  currency: "ARS",
  isArchived: false,
};

describe("assertCanContribute (SPEC-14)", () => {
  it("T-01 accepts a valid contribution between workspaces", () => {
    expect(() =>
      assertCanContribute({
        source,
        target,
        sourceMembership: { workspaceId: "ws-personal", role: "owner" },
        targetMembership: { workspaceId: "ws-casa", role: "member" },
      }),
    ).not.toThrow();
  });

  it("T-02 rejects same workspace", () => {
    expect(() =>
      assertCanContribute({
        source,
        target: { ...target, workspaceId: "ws-personal" },
        sourceMembership: { workspaceId: "ws-personal", role: "owner" },
        targetMembership: { workspaceId: "ws-personal", role: "owner" },
      }),
    ).toThrow(SameWorkspaceContributionError);
  });

  it("rejects viewer on either side", () => {
    expect(() =>
      assertCanContribute({
        source,
        target,
        sourceMembership: { workspaceId: "ws-personal", role: "viewer" },
        targetMembership: { workspaceId: "ws-casa", role: "member" },
      }),
    ).toThrow(ForbiddenError);
  });

  it("rejects archived account", () => {
    expect(() =>
      assertCanContribute({
        source: { ...source, isArchived: true },
        target,
        sourceMembership: { workspaceId: "ws-personal", role: "owner" },
        targetMembership: { workspaceId: "ws-casa", role: "member" },
      }),
    ).toThrow(AccountArchivedError);
  });

  it("rejects currency mismatch", () => {
    expect(() =>
      assertCanContribute({
        source,
        target: { ...target, currency: "USD" },
        sourceMembership: { workspaceId: "ws-personal", role: "owner" },
        targetMembership: { workspaceId: "ws-casa", role: "member" },
      }),
    ).toThrow(TransactionCurrencyMismatchError);
  });
});

describe("assertCanMutateContributionTwin (SPEC-14 T-06 / T-07 / KRI-19)", () => {
  const localMembership = { workspaceId: "ws-a", role: "owner" as const };
  const twinMembership = { workspaceId: "ws-b", role: "member" as const };

  it("allows update/delete when the actor can mutate both workspaces", () => {
    expect(() =>
      assertCanMutateContributionTwin({ localMembership, twinMembership }),
    ).not.toThrow();
  });

  it("Given no membership in B, When mutating the linked tx, Then Forbidden", () => {
    expect(() =>
      assertCanMutateContributionTwin({
        localMembership,
        twinMembership: null,
      }),
    ).toThrow(ForbiddenError);
  });

  it("rejects a missing local membership", () => {
    expect(() =>
      assertCanMutateContributionTwin({
        localMembership: null,
        twinMembership,
      }),
    ).toThrow(ForbiddenError);
  });

  it("rejects a viewer on the twin workspace", () => {
    expect(() =>
      assertCanMutateContributionTwin({
        localMembership,
        twinMembership: { workspaceId: "ws-b", role: "viewer" },
      }),
    ).toThrow(ForbiddenError);
  });

  it("rejects a viewer on the local workspace", () => {
    expect(() =>
      assertCanMutateContributionTwin({
        localMembership: { workspaceId: "ws-a", role: "viewer" },
        twinMembership,
      }),
    ).toThrow(ForbiddenError);
  });
});
