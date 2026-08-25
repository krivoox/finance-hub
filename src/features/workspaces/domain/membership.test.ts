import { describe, expect, it } from "vitest";
import { assertCanRename, ForbiddenError } from "./membership";

describe("Workspaces domain — authz predicates (SPEC-02 §5)", () => {
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
