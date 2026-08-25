import { ForbiddenError, WorkspaceDomainError } from "@/features/workspaces/domain";

export type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

/**
 * Maps domain errors to Spanish UI copy. Unknown errors stay generic.
 */
export function domainErrorToMessage(err: unknown): string {
  if (err instanceof ForbiddenError) {
    return "No tenés permiso para esta acción.";
  }
  if (err instanceof WorkspaceDomainError) {
    return err.message;
  }
  return "No pudimos completar la operación. Intentá de nuevo.";
}

export function domainErrorCode(err: unknown): string | null {
  if (err instanceof WorkspaceDomainError) return err.name;
  return null;
}
