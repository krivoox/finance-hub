import {
  CannotDeletePersonal,
  CannotLeaveAsLastOwner,
  CannotLeavePersonal,
  CannotRemoveLastOwner,
  ConfirmationNameMismatch,
  ForbiddenError,
  InvalidTransferError,
  WorkspaceDomainError,
  WorkspaceHasCrossLinks,
} from "@/features/workspaces/domain";

export type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

/**
 * Maps domain errors to Spanish UI copy. Unknown errors stay generic.
 */
export function domainErrorToMessage(err: unknown): string {
  if (err instanceof CannotDeletePersonal) {
    return "El workspace personal no se puede eliminar.";
  }
  if (err instanceof CannotLeavePersonal) {
    return "No podés salir del workspace personal.";
  }
  if (
    err instanceof CannotLeaveAsLastOwner ||
    err instanceof CannotRemoveLastOwner
  ) {
    return "No podés salir o remover al único owner del grupo. Transferí la propiedad primero.";
  }
  if (err instanceof WorkspaceHasCrossLinks) {
    return "Este grupo tiene vínculos con otros workspaces. Resolvelos antes de eliminarlo.";
  }
  if (err instanceof ConfirmationNameMismatch) {
    return "El nombre no coincide. Escribí el nombre exacto del grupo para confirmar.";
  }
  if (err instanceof ForbiddenError) {
    return "No tenés permiso para esta acción.";
  }
  if (err instanceof InvalidTransferError) {
    return err.message;
  }
  if (err instanceof WorkspaceDomainError) {
    return err.message;
  }
  return "No pudimos completar la operación. Intentá de nuevo.";
}

/** Stable error code for UI branching (e.g. cross-links CTA). */
export function domainErrorCode(err: unknown): string | null {
  if (err instanceof WorkspaceDomainError) return err.name;
  return null;
}
