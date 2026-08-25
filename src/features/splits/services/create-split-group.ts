import "server-only";
import { prisma } from "@/lib/prisma";
import {
  normalizeSplitGroupName,
  type SplitGroupKind,
} from "@/features/splits/domain";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { ForbiddenError } from "@/features/workspaces/domain";
import { memberDisplayName } from "./member-map";
import { generatePublicShareToken } from "./token";

export type CreateSplitGroupInput = {
  userId: string;
  name: string;
  kind: SplitGroupKind;
};

export async function createSplitGroup(input: CreateSplitGroupInput) {
  const name = normalizeSplitGroupName(input.name);
  const workspace = await getActiveWorkspaceForUser(input.userId);
  if (!workspace) {
    throw new ForbiddenError("No account");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { name: true, displayName: true, email: true },
  });

  return prisma.splitGroup.create({
    data: {
      workspaceId: workspace.id,
      name,
      kind: input.kind,
      currency: workspace.baseCurrency,
      publicShareToken: generatePublicShareToken(),
      createdByUserId: input.userId,
      members: {
        create: {
          kind: "user",
          userId: input.userId,
          displayName: memberDisplayName(user),
          displayNameKey: null,
        },
      },
    },
    include: { members: true },
  });
}
