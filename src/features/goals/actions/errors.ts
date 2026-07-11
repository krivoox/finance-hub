import { AccountDomainError } from "@/features/accounts/domain";
import { GoalDomainError } from "@/features/goals/domain";
import { WorkspaceDomainError } from "@/features/workspaces/domain";

export type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

export function goalErrorToMessage(err: unknown): string {
  if (err instanceof GoalDomainError) return err.message;
  if (err instanceof AccountDomainError) return err.message;
  if (err instanceof WorkspaceDomainError) return err.message;
  return "No pudimos completar la operación. Intentá de nuevo.";
}
