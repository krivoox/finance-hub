import { describe, expect, it } from "vitest";
import { formatPaymentAccountLabel } from "./payment-account-label";

describe("formatPaymentAccountLabel (SPEC-14 T-04)", () => {
  const base = {
    viewerUserId: "bob",
    accountName: "Visa BBVA",
    accountWorkspaceId: "ws-ana-personal",
    registrationWorkspaceId: "ws-casa",
    accountWorkspaceName: "Ana",
    accountWorkspaceType: "personal" as const,
    personalOwnerUserId: "ana",
    personalOwnerDisplayName: "Ana",
  };

  it("hides personal account name from other group members", () => {
    expect(formatPaymentAccountLabel(base)).toBe("Espacio personal de Ana");
  });

  it("shows full label to the account owner", () => {
    expect(
      formatPaymentAccountLabel({ ...base, viewerUserId: "ana" }),
    ).toBe("Ana · Visa BBVA");
  });

  it("shows account name when same workspace", () => {
    expect(
      formatPaymentAccountLabel({
        ...base,
        accountWorkspaceId: "ws-casa",
        registrationWorkspaceId: "ws-casa",
        accountWorkspaceType: "group",
        personalOwnerUserId: null,
        personalOwnerDisplayName: null,
      }),
    ).toBe("Visa BBVA");
  });
});
