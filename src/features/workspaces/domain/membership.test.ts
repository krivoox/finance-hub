import { describe, expect, it } from "vitest";
import {
  assertCanRename,
  ForbiddenError,
  pickDefaultLedgerWorkspace,
  toProductWorkspaceType,
} from "./membership";

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

  describe("toProductWorkspaceType — single implicit ledger (KRI-29)", () => {
    it("maps personal and leftover group to the product personal type", () => {
      expect(toProductWorkspaceType("personal")).toBe("personal");
      expect(toProductWorkspaceType("group")).toBe("personal");
    });
  });

  describe("pickDefaultLedgerWorkspace", () => {
    const t0 = new Date("2026-01-01T00:00:00.000Z");
    const t1 = new Date("2026-02-01T00:00:00.000Z");

    it("returns null when the user has no memberships", () => {
      expect(pickDefaultLedgerWorkspace([])).toBeNull();
    });

    it("keeps the cookie workspace so existing data stays in view", () => {
      expect(
        pickDefaultLedgerWorkspace([
          {
            workspaceId: "personal-1",
            type: "personal",
            joinedAt: t0,
            cookieHit: false,
          },
          {
            workspaceId: "group-casa",
            type: "group",
            joinedAt: t1,
            cookieHit: true,
          },
        ]),
      ).toBe("group-casa");
    });

    it("prefers personal when there is no cookie", () => {
      expect(
        pickDefaultLedgerWorkspace([
          {
            workspaceId: "group-casa",
            type: "group",
            joinedAt: t0,
            cookieHit: false,
          },
          {
            workspaceId: "personal-1",
            type: "personal",
            joinedAt: t1,
            cookieHit: false,
          },
        ]),
      ).toBe("personal-1");
    });

    it("uses a leftover group tenant when that is the only ledger", () => {
      expect(
        pickDefaultLedgerWorkspace([
          {
            workspaceId: "group-casa",
            type: "group",
            joinedAt: t0,
            cookieHit: false,
          },
        ]),
      ).toBe("group-casa");
    });
  });
});
