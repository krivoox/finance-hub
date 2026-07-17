import { describe, expect, it } from "vitest";
import { ForbiddenError } from "./membership";
import {
  SetupDismissNotAllowed,
  WorkspaceNotReady,
  assertCanDismissSetup,
  assertCanManageSetup,
  assertReadyToComplete,
  isWorkspaceReadyToUse,
  shouldRedirectToOnboarding,
} from "./setup";

describe("Workspaces domain — setup (SPEC-15)", () => {
  describe("isWorkspaceReadyToUse (T-01, T-02)", () => {
    it("is ready with one account", () => {
      expect(isWorkspaceReadyToUse({ accountCount: 1 })).toBe(true);
    });

    it("is ready with many accounts", () => {
      expect(isWorkspaceReadyToUse({ accountCount: 3 })).toBe(true);
    });

    it("is not ready with zero accounts", () => {
      expect(isWorkspaceReadyToUse({ accountCount: 0 })).toBe(false);
    });
  });

  describe("assertCanManageSetup (T-07)", () => {
    it("allows owner and admin", () => {
      expect(() => assertCanManageSetup("owner")).not.toThrow();
      expect(() => assertCanManageSetup("admin")).not.toThrow();
    });

    it("forbids member and viewer", () => {
      expect(() => assertCanManageSetup("member")).toThrow(ForbiddenError);
      expect(() => assertCanManageSetup("viewer")).toThrow(ForbiddenError);
    });
  });

  describe("assertReadyToComplete (T-04)", () => {
    it("throws WorkspaceNotReady without accounts", () => {
      expect(() => assertReadyToComplete(0)).toThrow(WorkspaceNotReady);
    });

    it("passes with accounts (T-05, T-08)", () => {
      expect(() => assertReadyToComplete(1)).not.toThrow();
    });
  });

  describe("assertCanDismissSetup (T-06)", () => {
    it("allows dismiss with zero accounts", () => {
      expect(() => assertCanDismissSetup(0)).not.toThrow();
    });

    it("rejects dismiss when accounts already exist", () => {
      expect(() => assertCanDismissSetup(1)).toThrow(SetupDismissNotAllowed);
    });
  });

  describe("shouldRedirectToOnboarding (T-03)", () => {
    it("redirects owner with no accounts and not dismissed", () => {
      expect(
        shouldRedirectToOnboarding({
          role: "owner",
          accountCount: 0,
          dismissedSetup: false,
        }),
      ).toBe(true);
    });

    it("does not redirect when dismissed", () => {
      expect(
        shouldRedirectToOnboarding({
          role: "owner",
          accountCount: 0,
          dismissedSetup: true,
        }),
      ).toBe(false);
    });

    it("does not redirect when ready", () => {
      expect(
        shouldRedirectToOnboarding({
          role: "owner",
          accountCount: 1,
          dismissedSetup: false,
        }),
      ).toBe(false);
    });

    it("does not redirect viewer", () => {
      expect(
        shouldRedirectToOnboarding({
          role: "viewer",
          accountCount: 0,
          dismissedSetup: false,
        }),
      ).toBe(false);
    });
  });
});
