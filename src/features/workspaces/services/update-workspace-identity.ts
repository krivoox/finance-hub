import "server-only";
import { prisma } from "@/lib/prisma";
import { isSupportedCurrency } from "@/features/auth/domain/profile";
import { WorkspaceDomainError } from "@/features/workspaces/domain";
import { requireSetupManager } from "./get-workspace-setup-status";

export type UpdateWorkspaceIdentityInput = {
  userId: string;
  workspaceId: string;
  name?: string;
  baseCurrency?: string;
};

/**
 * SPEC-15 — Update workspace name and/or base currency during onboarding.
 */
export async function updateWorkspaceIdentity({
  userId,
  workspaceId,
  name,
  baseCurrency,
}: UpdateWorkspaceIdentityInput): Promise<{
  id: string;
  name: string;
  baseCurrency: string;
}> {
  await requireSetupManager(userId, workspaceId);

  const data: { name?: string; baseCurrency?: string } = {};

  if (name !== undefined) {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      throw new WorkspaceDomainError(
        "El nombre debe tener entre 2 y 60 caracteres",
      );
    }
    data.name = trimmed;
  }

  if (baseCurrency !== undefined) {
    if (!isSupportedCurrency(baseCurrency)) {
      throw new WorkspaceDomainError("Moneda no soportada");
    }
    data.baseCurrency = baseCurrency;
  }

  if (Object.keys(data).length === 0) {
    const current = await prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { id: true, name: true, baseCurrency: true },
    });
    return current;
  }

  return prisma.workspace.update({
    where: { id: workspaceId },
    data,
    select: { id: true, name: true, baseCurrency: true },
  });
}
