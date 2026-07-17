import { z } from "zod";
import { ACCOUNT_CURRENCIES } from "@/domain/money/currencies";

const positiveIntCents = z
  .number({ message: "Debe ser un número" })
  .int("Debe ser entero")
  .positive("Debe ser mayor a 0");

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)");

export const createCurrencyExchangeSchema = z.object({
  workspaceId: z.string().min(1),
  fromAccountId: z.string().min(1, "Cuenta origen requerida"),
  toAccountId: z.string().min(1, "Cuenta destino requerida"),
  fromAmountCents: positiveIntCents,
  toAmountCents: positiveIntCents,
  occurredOn: isoDateSchema,
  description: z.string().trim().max(240).optional().nullable(),
});
export type CreateCurrencyExchangeInput = z.infer<
  typeof createCurrencyExchangeSchema
>;

export const deleteCurrencyExchangeSchema = z.object({
  exchangeId: z.string().min(1),
});
export type DeleteCurrencyExchangeInput = z.infer<
  typeof deleteCurrencyExchangeSchema
>;

export const upsertConsolidationRateSchema = z.object({
  workspaceId: z.string().min(1),
  /** Major units of base per 1 quote (e.g. ARS per USD): 1400 */
  arsPerUsd: z
    .number({ message: "Debe ser un número" })
    .positive("La tasa debe ser mayor a 0"),
  quoteCurrency: z.enum(ACCOUNT_CURRENCIES).default("USD"),
  label: z
    .string()
    .trim()
    .min(1, "Etiqueta requerida")
    .max(80, "Máximo 80 caracteres")
    .default("Manual"),
  asOf: z.string().datetime().or(isoDateSchema),
});
export type UpsertConsolidationRateInput = z.infer<
  typeof upsertConsolidationRateSchema
>;

export const getConsolidationRateSchema = z.object({
  workspaceId: z.string().min(1),
});
export type GetConsolidationRateInput = z.infer<
  typeof getConsolidationRateSchema
>;
