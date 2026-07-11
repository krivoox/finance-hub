import { describe, expect, it } from "vitest";
import { ForbiddenError } from "@/features/workspaces/domain";
import { assertCanMutateAccounts, assertCanReadAccounts } from "./authz";

describe("Accounts authz — SPEC-03 §2", () => {
  it("owner/admin/member can mutate accounts", () => {
    expect(() => assertCanMutateAccounts("owner")).not.toThrow();
    expect(() => assertCanMutateAccounts("admin")).not.toThrow();
    expect(() => assertCanMutateAccounts("member")).not.toThrow();
  });

  it("viewer cannot mutate accounts", () => {
    expect(() => assertCanMutateAccounts("viewer")).toThrow(ForbiddenError);
  });

  it("every role can read accounts (including viewer)", () => {
    expect(() => assertCanReadAccounts("owner")).not.toThrow();
    expect(() => assertCanReadAccounts("viewer")).not.toThrow();
  });
});
