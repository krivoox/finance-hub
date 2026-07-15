import { describe, expect, it } from "vitest";
import {
  assertCanContribute,
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
