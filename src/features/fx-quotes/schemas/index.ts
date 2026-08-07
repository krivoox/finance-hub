import { z } from "zod";

export const applyMepConsolidationRateSchema = z.object({
  workspaceId: z.string().min(1, "Workspace requerido"),
});

export type ApplyMepConsolidationRateInput = z.infer<
  typeof applyMepConsolidationRateSchema
>;
