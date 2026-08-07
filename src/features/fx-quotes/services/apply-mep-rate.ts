import "server-only";

import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/features/workspaces/services";
import { assertCanMutateTransactions } from "@/features/transactions/domain";
import {
  buildConsolidationRateFromMepQuote,
  MepQuoteUnavailableError,
} from "@/features/fx-quotes/domain";
import {
  type ConsolidationRateRecord,
} from "@/features/currency-exchange/services/consolidation-rate";
import { CONSOLIDATION_RATE_SCALE } from "@/features/dashboard/domain/consolidation";

/**
 * SPEC-19 FR-04 — Explicit "Usar MEP de hoy" → upsert WorkspaceConsolidationRate.
 */
export async function applyConsolidationRateFromMepQuote(input: {
  userId: string;
  workspaceId: string;
}): Promise<ConsolidationRateRecord> {
  const { role } = await requireMembership(input.userId, input.workspaceId);
  assertCanMutateTransactions(role);

  const snapshot = await prisma.usdQuoteSnapshot.findFirst({
    orderBy: { asOfDate: "desc" },
    include: {
      lines: { where: { casa: "bolsa" }, take: 1 },
    },
  });

  const bolsa = snapshot?.lines[0];
  if (!bolsa) {
    throw new MepQuoteUnavailableError();
  }

  const patch = buildConsolidationRateFromMepQuote({
    casa: bolsa.casa,
    sellRateScaled: bolsa.sellRateScaled,
    scale: bolsa.scale,
    providerUpdatedAt: bolsa.providerUpdatedAt,
  });

  return prisma.workspaceConsolidationRate.upsert({
    where: { workspaceId: input.workspaceId },
    create: {
      workspaceId: input.workspaceId,
      quoteCurrency: patch.quoteCurrency,
      rateScaled: patch.rateScaled,
      scale: patch.scale || CONSOLIDATION_RATE_SCALE,
      label: patch.label,
      asOf: patch.asOf,
      updatedByUserId: input.userId,
    },
    update: {
      quoteCurrency: patch.quoteCurrency,
      rateScaled: patch.rateScaled,
      scale: patch.scale || CONSOLIDATION_RATE_SCALE,
      label: patch.label,
      asOf: patch.asOf,
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
