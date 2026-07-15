/**
 * SPEC-14 FR-06 — Payment account labels with privacy for foreign personal accounts.
 */

export type PaymentAccountLabelInput = {
  viewerUserId: string;
  accountName: string;
  accountWorkspaceId: string;
  registrationWorkspaceId: string;
  accountWorkspaceName: string;
  accountWorkspaceType: "personal" | "group";
  /** Owner of the personal workspace that holds the account (if personal). */
  personalOwnerUserId: string | null;
  personalOwnerDisplayName: string | null;
};

/**
 * When the payment account is in the registration workspace, show the account name.
 * When it is a foreign personal account and the viewer is not the owner, hide the
 * account name behind “Espacio personal de {name}”.
 */
export function formatPaymentAccountLabel(
  input: PaymentAccountLabelInput,
): string {
  const sameWorkspace =
    input.accountWorkspaceId === input.registrationWorkspaceId;

  if (sameWorkspace) {
    return input.accountName;
  }

  if (
    input.accountWorkspaceType === "personal" &&
    input.personalOwnerUserId &&
    input.personalOwnerUserId !== input.viewerUserId
  ) {
    const who =
      input.personalOwnerDisplayName?.trim() ||
      "otro miembro";
    return `Espacio personal de ${who}`;
  }

  return `${input.accountWorkspaceName} · ${input.accountName}`;
}

export function isExternallyFundedAccount(
  accountWorkspaceId: string,
  registrationWorkspaceId: string,
): boolean {
  return accountWorkspaceId !== registrationWorkspaceId;
}
