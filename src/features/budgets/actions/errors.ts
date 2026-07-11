import { BudgetDomainError } from "@/features/budgets/domain";
import { WorkspaceDomainError } from "@/features/workspaces/domain";

export type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

export function budgetErrorToMessage(err: unknown): string {
  if (err instanceof BudgetDomainError) return err.message;
  if (err instanceof WorkspaceDomainError) return err.message;
  return "No pudimos completar la operación. Intentá de nuevo.";
}
