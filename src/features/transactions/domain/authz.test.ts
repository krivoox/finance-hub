import { describe, expect, it } from "vitest";
import { ForbiddenError } from "@/features/workspaces/domain";
import {
  assertCanMutateTransactions,
  assertCanReadTransactions,
} from "./authz";

describe("Transactions authz — SPEC-05 §4 / SPEC-06 §4", () => {
  it("owner / admin / member can mutate", () => {
    expect(() => assertCanMutateTransactions("owner")).not.toThrow();
    expect(() => assertCanMutateTransactions("admin")).not.toThrow();
    expect(() => assertCanMutateTransactions("member")).not.toThrow();
  });

  it("viewer cannot mutate", () => {
    expect(() => assertCanMutateTransactions("viewer")).toThrow(ForbiddenError);
  });

  it("every role can read", () => {
    for (const role of ["owner", "admin", "member", "viewer"] as const) {
      expect(() => assertCanReadTransactions(role)).not.toThrow();
    }
  });
});
