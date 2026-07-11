/**
 * Pure category rules (SPEC-04 §4).
 *
 * These helpers are side-effect free. They are consumed by services and Server
 * Actions after Prisma reads and drive TDD for the T-01..T-04 scenarios.
 *
 * The uniqueness rule (workspaceId + kind + name, case-insensitive, among
 * non-archived) is enforced here rather than in the DB because Postgres has no
 * built-in case-insensitive unique index without an expression index, and the
 * domain layer is the single source of truth for business rules (see
 * `docs/architecture.md`).
 */

import type { MembershipRole } from "@/features/workspaces/domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CategoryKind = "income" | "expense";

export type CategoryLike = {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly kind: CategoryKind;
  readonly parentId: string | null;
  readonly isArchived: boolean;
};

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class CategoryDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CategoryDomainError";
  }
}

export class DuplicateCategoryName extends CategoryDomainError {
  constructor(name: string, kind: CategoryKind) {
    super(`Ya existe una categoría "${name}" de tipo ${kind} en el workspace`);
    this.name = "DuplicateCategoryName";
  }
}

export class MaxCategoryDepth extends CategoryDomainError {
  constructor() {
    super("Las categorías admiten un solo nivel de anidación");
    this.name = "MaxCategoryDepth";
  }
}

export class CategoryKindMismatchError extends CategoryDomainError {
  constructor(parentKind: CategoryKind, childKind: CategoryKind) {
    super(
      `El tipo del padre (${parentKind}) no coincide con el hijo (${childKind})`,
    );
    this.name = "CategoryKindMismatchError";
  }
}

export class CategoryKindImmutableError extends CategoryDomainError {
  constructor() {
    super("El tipo (income/expense) de una categoría no se puede cambiar");
    this.name = "CategoryKindImmutableError";
  }
}

export class CategoryWorkspaceMismatchError extends CategoryDomainError {
  constructor() {
    super("La categoría padre pertenece a otro workspace");
    this.name = "CategoryWorkspaceMismatchError";
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CATEGORY_NAME_MIN_LENGTH = 1;
export const CATEGORY_NAME_MAX_LENGTH = 60;

/**
 * SPEC-04 T-01 — Defaults seeded on workspace creation.
 * Must contain ≥ 5 expense and ≥ 2 income categories.
 * All names are top-level (no parent) and case-insensitively unique per kind.
 */
export const DEFAULT_CATEGORIES: readonly {
  readonly name: string;
  readonly kind: CategoryKind;
}[] = [
  { name: "Comida", kind: "expense" },
  { name: "Transporte", kind: "expense" },
  { name: "Vivienda", kind: "expense" },
  { name: "Servicios", kind: "expense" },
  { name: "Ocio", kind: "expense" },
  { name: "Salud", kind: "expense" },
  { name: "Educación", kind: "expense" },
  { name: "Otros gastos", kind: "expense" },
  { name: "Salario", kind: "income" },
  { name: "Otros ingresos", kind: "income" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Trims and collapses internal whitespace. Returns the empty string when the
 * input has no visible characters — callers must validate emptiness separately.
 */
export function normalizeCategoryName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Case- and diacritic-insensitive comparison key used for uniqueness checks.
 * Uses NFKD + strip combining marks so "Educación" and "educacion" collide.
 */
function comparisonKey(name: string): string {
  return normalizeCategoryName(name)
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "");
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

export type UniqueNameOptions = {
  /** Skip this id — used for renames where the target is the same entity. */
  readonly excludeId?: string;
};

/**
 * SPEC-04 T-02 — Unique per (workspaceId, kind) among non-archived, case-
 * insensitive. Callers must pre-filter `existing` to the same workspaceId.
 */
export function assertUniqueCategoryName(
  existing: readonly CategoryLike[],
  name: string,
  kind: CategoryKind,
  options: UniqueNameOptions = {},
): void {
  const normalized = normalizeCategoryName(name);
  if (normalized.length === 0) {
    throw new CategoryDomainError("El nombre de la categoría es obligatorio");
  }

  const target = comparisonKey(normalized);
  const conflict = existing.find(
    (c) =>
      c.kind === kind &&
      !c.isArchived &&
      c.id !== options.excludeId &&
      comparisonKey(c.name) === target,
  );
  if (conflict) {
    throw new DuplicateCategoryName(normalized, kind);
  }
}

/**
 * SPEC-04 T-03 — Only one level of nesting. If `parent` itself has a parent
 * we would be creating a grandchild, which is disallowed.
 */
export function assertMaxCategoryDepth(parent: CategoryLike | null): void {
  if (!parent) return;
  if (parent.parentId !== null && parent.parentId !== undefined) {
    throw new MaxCategoryDepth();
  }
}

/**
 * SPEC-04 T-04 — A child must share its parent's kind (income/expense).
 */
export function assertParentKindMatches(
  parent: CategoryLike | null,
  childKind: CategoryKind,
): void {
  if (!parent) return;
  if (parent.kind !== childKind) {
    throw new CategoryKindMismatchError(parent.kind, childKind);
  }
}

/**
 * Enforces multi-tenancy (ADR-002): a parent must belong to the same workspace
 * as the child being created.
 */
export function assertParentSameWorkspace(
  parent: CategoryLike | null,
  workspaceId: string,
): void {
  if (!parent) return;
  if (parent.workspaceId !== workspaceId) {
    throw new CategoryWorkspaceMismatchError();
  }
}

/**
 * SPEC-04 FR-03 — kind is immutable once a category exists.
 */
export function assertKindImmutable(
  current: CategoryKind,
  proposed: CategoryKind,
): void {
  if (current !== proposed) {
    throw new CategoryKindImmutableError();
  }
}

/**
 * Authorization predicate — viewers can read categories but only member+ may
 * mutate them (SPEC-04 + shared workspaces authorization).
 */
export function assertCanWriteCategories(role: MembershipRole): void {
  if (role === "viewer") {
    throw new CategoryDomainError(
      "Los usuarios viewer no pueden modificar categorías",
    );
  }
}

// ---------------------------------------------------------------------------
// Input validators (for create/rename commands)
// ---------------------------------------------------------------------------

export type CreateCategoryDomainInput = {
  readonly name: string;
  readonly kind: CategoryKind;
};

export type CreateCategoryValidated = {
  readonly name: string;
  readonly kind: CategoryKind;
};

/**
 * Trims + validates length. Does NOT check uniqueness (that requires DB reads).
 */
export function validateCreateCategoryInput(
  input: CreateCategoryDomainInput,
): CreateCategoryValidated {
  const name = normalizeCategoryName(input.name);
  if (name.length < CATEGORY_NAME_MIN_LENGTH) {
    throw new CategoryDomainError("El nombre de la categoría es obligatorio");
  }
  if (name.length > CATEGORY_NAME_MAX_LENGTH) {
    throw new CategoryDomainError(
      `El nombre debe tener ${CATEGORY_NAME_MAX_LENGTH} caracteres o menos`,
    );
  }
  if (input.kind !== "income" && input.kind !== "expense") {
    throw new CategoryDomainError("Tipo de categoría inválido");
  }
  return { name, kind: input.kind };
}
