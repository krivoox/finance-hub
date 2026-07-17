import "server-only";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import {
  arsPerUsdToRateScaled,
  assertValidConsolidationRate,
  CONSOLIDATION_RATE_SCALE,
  InvalidConsolidationRateError,
} from "@/features/dashboard/domain/consolidation";
import { assertCanMutateTransactions } from "@/features/transactions/domain";

export type ConsolidationRateRecord = {
  id: string;
  workspaceId: string;
  quoteCurrency: string;
  rateScaled: number;
  scale: number;
  label: string;
  asOf: Date;
  updatedByUserId: string;
  updatedAt: Date;
};

export async function getConsolidationRate({
  userId,
  workspaceId,
}: {
  userId: string;
  workspaceId: string;
}): Promise<ConsolidationRateRecord | null> {
  await requireMembership(userId, workspaceId);

  return prisma.workspaceConsolidationRate.findUnique({
    where: { workspaceId },
    select: {
      id: true,
      workspaceId: true,
      quoteCurrency: true,
      rateScaled: true,
      scale: true,
      label: true,
      asOf: true,
      updatedByUserId: true,
      updatedAt: true,
    },
  });
}

export type UpsertConsolidationRateServiceInput = {
  userId: string;
  workspaceId: string;
  arsPerUsd: number;
  quoteCurrency?: string;
  label: string;
  asOf: Date | string;
};

/**
 * SPEC-12 FR-06 — One active manual rate per workspace (upsert).
 */
export async function upsertConsolidationRate(
  input: UpsertConsolidationRateServiceInput,
): Promise<ConsolidationRateRecord> {
  const { role } = await requireMembership(input.userId, input.workspaceId);
  assertCanMutateTransactions(role);

  if (!Number.isFinite(input.arsPerUsd) || input.arsPerUsd <= 0) {
    throw new InvalidConsolidationRateError();
  }

  const rateScaled = arsPerUsdToRateScaled(input.arsPerUsd);
  assertValidConsolidationRate(rateScaled);

  const quoteCurrency = input.quoteCurrency ?? "USD";
  const label = input.label.trim() || "Manual";
  const asOf =
    input.asOf instanceof Date
      ? input.asOf
      : /^\d{4}-\d{2}-\d{2}$/.test(input.asOf)
        ? new Date(`${input.asOf}T12:00:00.000Z`)
        : new Date(input.asOf);

  if (Number.isNaN(asOf.getTime())) {
    throw new InvalidConsolidationRateError("Fecha de vigencia inválida");
  }

  return prisma.workspaceConsolidationRate.upsert({
    where: { workspaceId: input.workspaceId },
    create: {
      workspaceId: input.workspaceId,
      quoteCurrency,
      rateScaled,
      scale: CONSOLIDATION_RATE_SCALE,
      label,
      asOf,
      updatedByUserId: input.userId,
    },
    update: {
      quoteCurrency,
      rateScaled,
      scale: CONSOLIDATION_RATE_SCALE,
      label,
      asOf,
      updatedByUserId: input.userId,
    },
    select: {
      id: true,
      workspaceId: true,
      quoteCurrency: true,
      rateScaled: true,
      scale: true,
      label: true,
      asOf: true,
      updatedByUserId: true,
      updatedAt: true,
    },
  });
}
