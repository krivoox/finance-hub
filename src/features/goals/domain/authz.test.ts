import { describe, expect, it } from "vitest";
import { ForbiddenError } from "@/features/workspaces/domain";
import { assertCanMutateGoals, assertCanReadGoals } from "./authz";

describe("Goals authz — SPEC-08 §2 / shared workspaces rules", () => {
  it("owner/admin/member can mutate goals", () => {
    expect(() => assertCanMutateGoals("owner")).not.toThrow();
    expect(() => assertCanMutateGoals("admin")).not.toThrow();
    expect(() => assertCanMutateGoals("member")).not.toThrow();
  });

  it("viewer cannot mutate goals", () => {
    expect(() => assertCanMutateGoals("viewer")).toThrow(ForbiddenError);
  });

  it("every role can read goals (including viewer)", () => {
    expect(() => assertCanReadGoals("owner")).not.toThrow();
    expect(() => assertCanReadGoals("viewer")).not.toThrow();
  });
});
