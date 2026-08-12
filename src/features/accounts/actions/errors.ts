import {
  AccountDeleteConfirmationMismatchError,
  AccountDomainError,
  AccountHasCrossWorkspaceLinksError,
  AccountLinkedToActiveGoalError,
  AccountNotFoundError,
  CannotDeleteLastActiveAccountError,
  InvalidAccountNameError,
  InvalidCreditLimitError,
  InvalidInitialBalanceError,
  UnsupportedAccountCurrencyError,
  AccountArchivedError,
} from "@/features/accounts/domain";
import { WorkspaceDomainError } from "@/features/workspaces/domain";

export type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

/**
 * Maps domain errors to Spanish user-facing copy (SPEC-03 §11).
 */
export function domainErrorToMessage(err: unknown): string {
  if (err instanceof AccountLinkedToActiveGoalError) {
    return "Esta cuenta está vinculada a un objetivo activo. Cancelá o completá el objetivo antes de archivar o eliminar.";
  }
  if (err instanceof CannotDeleteLastActiveAccountError) {
    return "No podés eliminar la única cuenta activa. Archivá esta cuenta o creá otra antes de eliminarla.";
  }
  if (err instanceof AccountHasCrossWorkspaceLinksError) {
    return "Esta cuenta tiene movimientos vinculados a otro espacio. No se puede eliminar.";
  }
  if (err instanceof AccountDeleteConfirmationMismatchError) {
    return "El nombre no coincide. Escribí el nombre exacto de la cuenta.";
  }
  if (err instanceof AccountNotFoundError) {
    return "No encontramos esa cuenta.";
  }
  if (err instanceof AccountArchivedError) {
    return "La cuenta está archivada y no acepta nuevas operaciones.";
  }
  if (err instanceof UnsupportedAccountCurrencyError) {
    return "Moneda no soportada. Usá ARS o USD.";
  }
  if (err instanceof InvalidAccountNameError) {
    return "Nombre de cuenta inválido.";
  }
  if (err instanceof InvalidCreditLimitError) {
    return "Límite de crédito inválido. Solo aplica a tarjetas y debe ser mayor a 0.";
  }
  if (err instanceof InvalidInitialBalanceError) {
    return "Saldo inicial inválido.";
  }
  if (err instanceof AccountDomainError) return err.message;
  if (err instanceof WorkspaceDomainError) return err.message;
  return "No pudimos completar la operación. Intentá de nuevo.";
}
