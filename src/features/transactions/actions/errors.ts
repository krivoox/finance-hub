import { AccountDomainError } from "@/features/accounts/domain";
import { CategoryDomainError } from "@/features/categories/domain";
import { TransactionDomainError } from "@/features/transactions/domain";
import { WorkspaceDomainError } from "@/features/workspaces/domain";

export type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

export function transactionErrorToMessage(err: unknown): string {
  if (err instanceof TransactionDomainError) return err.message;
  if (err instanceof AccountDomainError) return err.message;
  if (err instanceof CategoryDomainError) return err.message;
  if (err instanceof WorkspaceDomainError) return err.message;
  return "No pudimos completar la operación. Intentá de nuevo.";
}
