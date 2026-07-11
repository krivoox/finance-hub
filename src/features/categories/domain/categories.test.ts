import { describe, expect, it } from "vitest";
import {
  CategoryDomainError,
  CategoryKindImmutableError,
  CategoryKindMismatchError,
  CategoryWorkspaceMismatchError,
  DEFAULT_CATEGORIES,
  DuplicateCategoryName,
  MaxCategoryDepth,
  assertCanWriteCategories,
  assertKindImmutable,
  assertMaxCategoryDepth,
  assertParentKindMatches,
  assertParentSameWorkspace,
  assertUniqueCategoryName,
  normalizeCategoryName,
  validateCreateCategoryInput,
  type CategoryLike,
} from "./categories";

const WS = "ws-1";

const cat = (overrides: Partial<CategoryLike> = {}): CategoryLike => ({
  id: overrides.id ?? "c-" + Math.random().toString(36).slice(2, 8),
  workspaceId: overrides.workspaceId ?? WS,
  name: overrides.name ?? "Comida",
  kind: overrides.kind ?? "expense",
  parentId: overrides.parentId ?? null,
  isArchived: overrides.isArchived ?? false,
});

// ---------------------------------------------------------------------------
// T-01 Seed — constant provides required defaults
// ---------------------------------------------------------------------------
describe("Categories domain — DEFAULT_CATEGORIES (SPEC-04 T-01)", () => {
  it("contains at least 5 expense categories", () => {
    const expenses = DEFAULT_CATEGORIES.filter((c) => c.kind === "expense");
    expect(expenses.length).toBeGreaterThanOrEqual(5);
  });

  it("contains at least 2 income categories", () => {
    const incomes = DEFAULT_CATEGORIES.filter((c) => c.kind === "income");
    expect(incomes.length).toBeGreaterThanOrEqual(2);
  });

  it("has unique (kind, name) pairs (case-insensitive)", () => {
    const keys = DEFAULT_CATEGORIES.map((c) => `${c.kind}::${c.name.toLowerCase()}`);
    const dedup = new Set(keys);
    expect(dedup.size).toBe(keys.length);
  });

  it("has non-empty trimmed names", () => {
    for (const c of DEFAULT_CATEGORIES) {
      expect(c.name).toBe(c.name.trim());
      expect(c.name.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// T-02 Duplicate name (case-insensitive, non-archived only)
// ---------------------------------------------------------------------------
describe("Categories domain — assertUniqueCategoryName (SPEC-04 T-02)", () => {
  it("throws DuplicateCategoryName for exact match", () => {
    const existing = [cat({ name: "Comida", kind: "expense" })];
    expect(() =>
      assertUniqueCategoryName(existing, "Comida", "expense"),
    ).toThrow(DuplicateCategoryName);
  });

  it("throws DuplicateCategoryName for case-insensitive match", () => {
    const existing = [cat({ name: "Comida", kind: "expense" })];
    expect(() =>
      assertUniqueCategoryName(existing, "comida", "expense"),
    ).toThrow(DuplicateCategoryName);
    expect(() =>
      assertUniqueCategoryName(existing, "COMIDA", "expense"),
    ).toThrow(DuplicateCategoryName);
  });

  it("normalizes whitespace before comparison", () => {
    const existing = [cat({ name: "Comida", kind: "expense" })];
    expect(() =>
      assertUniqueCategoryName(existing, "  comida  ", "expense"),
    ).toThrow(DuplicateCategoryName);
  });

  it("allows the same name across different kinds", () => {
    const existing = [cat({ name: "Otros", kind: "expense" })];
    expect(() =>
      assertUniqueCategoryName(existing, "Otros", "income"),
    ).not.toThrow();
  });

  it("ignores archived categories when checking uniqueness", () => {
    const existing = [
      cat({ name: "Comida", kind: "expense", isArchived: true }),
    ];
    expect(() =>
      assertUniqueCategoryName(existing, "Comida", "expense"),
    ).not.toThrow();
  });

  it("supports excluding a category (for rename of the same entity)", () => {
    const c = cat({ id: "c-1", name: "Comida", kind: "expense" });
    const existing = [c];
    expect(() =>
      assertUniqueCategoryName(existing, "Comida", "expense", { excludeId: "c-1" }),
    ).not.toThrow();
  });

  it("empty/whitespace names throw CategoryDomainError (not silently pass)", () => {
    const existing: CategoryLike[] = [];
    expect(() => assertUniqueCategoryName(existing, "   ", "expense")).toThrow(
      CategoryDomainError,
    );
  });
});

// ---------------------------------------------------------------------------
// T-03 Max depth — parent cannot itself have a parent
// ---------------------------------------------------------------------------
describe("Categories domain — assertMaxCategoryDepth (SPEC-04 T-03)", () => {
  it("allows creating a child under a top-level parent", () => {
    const parent = cat({ id: "p", parentId: null });
    expect(() => assertMaxCategoryDepth(parent)).not.toThrow();
  });

  it("throws MaxCategoryDepth when parent is itself a child", () => {
    const parent = cat({ id: "p", parentId: "grand-parent" });
    expect(() => assertMaxCategoryDepth(parent)).toThrow(MaxCategoryDepth);
  });

  it("null parent (top-level) is always allowed", () => {
    expect(() => assertMaxCategoryDepth(null)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// T-04 Kind mismatch parent
// ---------------------------------------------------------------------------
describe("Categories domain — assertParentKindMatches (SPEC-04 T-04)", () => {
  it("allows same-kind parent/child (income/income)", () => {
    const parent = cat({ kind: "income" });
    expect(() => assertParentKindMatches(parent, "income")).not.toThrow();
  });

  it("allows same-kind parent/child (expense/expense)", () => {
    const parent = cat({ kind: "expense" });
    expect(() => assertParentKindMatches(parent, "expense")).not.toThrow();
  });

  it("throws when parent is income and child is expense", () => {
    const parent = cat({ kind: "income" });
    expect(() => assertParentKindMatches(parent, "expense")).toThrow(
      CategoryKindMismatchError,
    );
  });

  it("throws when parent is expense and child is income", () => {
    const parent = cat({ kind: "expense" });
    expect(() => assertParentKindMatches(parent, "income")).toThrow(
      CategoryKindMismatchError,
    );
  });

  it("no-op when parent is null", () => {
    expect(() => assertParentKindMatches(null, "expense")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Parent must belong to same workspace
// ---------------------------------------------------------------------------
describe("Categories domain — assertParentSameWorkspace", () => {
  it("allows same workspace", () => {
    const parent = cat({ workspaceId: WS });
    expect(() => assertParentSameWorkspace(parent, WS)).not.toThrow();
  });

  it("throws when parent belongs to another workspace", () => {
    const parent = cat({ workspaceId: "other-ws" });
    expect(() => assertParentSameWorkspace(parent, WS)).toThrow(
      CategoryWorkspaceMismatchError,
    );
  });

  it("no-op when parent is null", () => {
    expect(() => assertParentSameWorkspace(null, WS)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Kind is immutable after creation
// ---------------------------------------------------------------------------
describe("Categories domain — assertKindImmutable", () => {
  it("no-op when kinds match", () => {
    expect(() => assertKindImmutable("expense", "expense")).not.toThrow();
  });

  it("throws when trying to change kind", () => {
    expect(() => assertKindImmutable("expense", "income")).toThrow(
      CategoryKindImmutableError,
    );
  });
});

// ---------------------------------------------------------------------------
// Name normalization
// ---------------------------------------------------------------------------
describe("Categories domain — normalizeCategoryName", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalizeCategoryName("  Compras    online  ")).toBe(
      "Compras online",
    );
  });

  it("returns empty string for whitespace-only input", () => {
    expect(normalizeCategoryName("   ")).toBe("");
  });

  it("keeps single-space words untouched", () => {
    expect(normalizeCategoryName("Salud")).toBe("Salud");
  });
});

// ---------------------------------------------------------------------------
// Create input validator (name length + kind)
// ---------------------------------------------------------------------------
describe("Categories domain — validateCreateCategoryInput", () => {
  it("returns normalized name when valid", () => {
    const out = validateCreateCategoryInput({
      name: "  Comida  ",
      kind: "expense",
    });
    expect(out.name).toBe("Comida");
    expect(out.kind).toBe("expense");
  });

  it("throws when name is empty after trim", () => {
    expect(() =>
      validateCreateCategoryInput({ name: "   ", kind: "expense" }),
    ).toThrow(CategoryDomainError);
  });

  it("throws when name is too long", () => {
    const longName = "x".repeat(120);
    expect(() =>
      validateCreateCategoryInput({ name: longName, kind: "expense" }),
    ).toThrow(CategoryDomainError);
  });
});

// ---------------------------------------------------------------------------
// Authorization: viewer read; member+ write
// ---------------------------------------------------------------------------
describe("Categories domain — assertCanWriteCategories", () => {
  it("allows owner/admin/member", () => {
    expect(() => assertCanWriteCategories("owner")).not.toThrow();
    expect(() => assertCanWriteCategories("admin")).not.toThrow();
    expect(() => assertCanWriteCategories("member")).not.toThrow();
  });

  it("throws for viewer", () => {
    expect(() => assertCanWriteCategories("viewer")).toThrow(
      CategoryDomainError,
    );
  });
});
