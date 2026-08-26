"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Archive } from "lucide-react";
import { toast } from "sonner";

import {
  FormActions,
  FormField,
  FormSheet,
  FormStack,
  SegmentedControl,
} from "@/components/form-sheet";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import { Badge } from "@/components/ui/badge";
import { refreshAfterMutation } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  archiveCategoryAction,
  createCategoryAction,
  renameCategoryAction,
} from "@/features/categories/actions";
import { invalidateNewTransactionFormOptions } from "@/features/transactions/stores/new-transaction-form-options-store";
import {
  CONTRIBUTION_CATEGORY_NAMES,
  type CategoryKind,
} from "@/features/categories/domain";

export type CategoryListItem = {
  id: string;
  name: string;
  kind: CategoryKind;
  isArchived: boolean;
};

type CategoriesSettingsPanelProps = {
  workspaceId: string;
  workspaceName: string;
  canMutate: boolean;
  categories: readonly CategoryListItem[];
};

const KIND_OPTIONS = [
  { value: "expense" as const, label: "Gastos" },
  { value: "income" as const, label: "Ingresos" },
];

function isSystemCategory(name: string, kind: CategoryKind): boolean {
  if (kind === "expense" && name === CONTRIBUTION_CATEGORY_NAMES.expense) {
    return true;
  }
  if (kind === "income" && name === CONTRIBUTION_CATEGORY_NAMES.income) {
    return true;
  }
  return false;
}

export function CategoriesSettingsPanel({
  workspaceId,
  workspaceName,
  canMutate,
  categories,
}: CategoriesSettingsPanelProps) {
  const router = useRouter();
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<CategoryListItem | null>(
    null,
  );

  const active = categories.filter((c) => !c.isArchived && c.kind === kind);
  const archived = categories.filter((c) => c.isArchived && c.kind === kind);

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <SurfaceSection>
        <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h2 className="font-heading text-sm font-extrabold tracking-tight text-foreground">
              Categorías
            </h2>
            <p className="text-xs text-muted-foreground text-pretty">
              De{" "}
              <span className="text-foreground">{workspaceName}</span>. Se usan
              en movimientos, presupuestos y analytics.
            </p>
          </div>
          {canMutate ? (
            <FormSheet
              open={createOpen}
              onOpenChange={setCreateOpen}
              title="Nueva categoría"
              description={`Tipo: ${kind === "expense" ? "gasto" : "ingreso"}.`}
              size="md"
              trigger={
                <Button className="w-full gap-1.5 sm:w-auto">
                  <Plus className="size-4" strokeWidth={1.75} />
                  Nueva
                </Button>
              }
            >
              <CreateCategoryForm
                workspaceId={workspaceId}
                kind={kind}
                onSuccess={() => {
                  setCreateOpen(false);
                  refreshAfterMutation(router);
                }}
                onCancel={() => setCreateOpen(false)}
              />
            </FormSheet>
          ) : null}
        </header>

        <SegmentedControl
          ariaLabel="Tipo de categoría"
          value={kind}
          options={KIND_OPTIONS}
          onChange={setKind}
        />

        {active.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No hay categorías de {kind === "expense" ? "gasto" : "ingreso"}{" "}
            activas.
          </p>
        ) : (
          <ul className="-mx-2 mt-4 divide-y divide-border">
            {active.map((category) => {
              const system = isSystemCategory(category.name, category.kind);
              return (
                <li
                  key={category.id}
                  className="flex min-w-0 items-center justify-between gap-3 px-2 py-3"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-foreground">
                      {category.name}
                    </span>
                    {system ? (
                      <Badge variant="secondary">Sistema</Badge>
                    ) : null}
                  </div>
                  {canMutate && !system ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Renombrar ${category.name}`}
                        onClick={() => setRenameTarget(category)}
                      >
                        <Pencil strokeWidth={1.75} />
                      </Button>
                      <ArchiveCategoryButton
                        workspaceId={workspaceId}
                        categoryId={category.id}
                        categoryName={category.name}
                        onDone={() => refreshAfterMutation(router)}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SurfaceSection>

      {archived.length > 0 ? (
        <SurfaceSection muted>
          <SurfaceHeader title="Archivadas" />
          <ul className="-mx-2 divide-y divide-border">
            {archived.map((category) => (
              <li
                key={category.id}
                className="px-2 py-2.5 text-sm text-muted-foreground"
              >
                {category.name}
              </li>
            ))}
          </ul>
        </SurfaceSection>
      ) : null}

      {renameTarget ? (
        <FormSheet
          open={Boolean(renameTarget)}
          onOpenChange={(open) => {
            if (!open) setRenameTarget(null);
          }}
          title="Renombrar categoría"
          description={renameTarget.name}
          size="md"
        >
          <RenameCategoryForm
            workspaceId={workspaceId}
            categoryId={renameTarget.id}
            initialName={renameTarget.name}
            onSuccess={() => {
              setRenameTarget(null);
              refreshAfterMutation(router);
            }}
            onCancel={() => setRenameTarget(null)}
          />
        </FormSheet>
      ) : null}
    </div>
  );
}

function CreateCategoryForm({
  workspaceId,
  kind,
  onSuccess,
  onCancel,
}: {
  workspaceId: string;
  kind: CategoryKind;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createCategoryAction({
        workspaceId,
        name,
        kind,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Categoría creada");
      invalidateNewTransactionFormOptions();
      setName("");
      onSuccess();
    });
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FormStack>
        <FormField label="Nombre" htmlFor="new-category-name">
          <Input
            id="new-category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              kind === "expense" ? "Supermercado, Farmacia…" : "Freelance…"
            }
            disabled={isPending}
            autoFocus
          />
        </FormField>
      </FormStack>
      <FormActions>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={isPending}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={isPending || !name.trim()}
        >
          {isPending ? "Creando…" : "Crear"}
        </Button>
      </FormActions>
    </form>
  );
}

function RenameCategoryForm({
  workspaceId,
  categoryId,
  initialName,
  onSuccess,
  onCancel,
}: {
  workspaceId: string;
  categoryId: string;
  initialName: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await renameCategoryAction({
        workspaceId,
        categoryId,
        name,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Categoría renombrada");
      invalidateNewTransactionFormOptions();
      onSuccess();
    });
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FormStack>
        <FormField label="Nombre" htmlFor="rename-category-name">
          <Input
            id="rename-category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            autoFocus
          />
        </FormField>
      </FormStack>
      <FormActions>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={isPending}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={isPending || !name.trim()}
        >
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
      </FormActions>
    </form>
  );
}

function ArchiveCategoryButton({
  workspaceId,
  categoryId,
  categoryName,
  onDone,
}: {
  workspaceId: string;
  categoryId: string;
  categoryName: string;
  onDone: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!confirm) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Archivar ${categoryName}`}
        disabled={isPending}
        onClick={() => setConfirm(true)}
      >
        <Archive strokeWidth={1.75} />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        disabled={isPending}
        onClick={() => setConfirm(false)}
      >
        No
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="h-7 text-xs"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const result = await archiveCategoryAction({
              workspaceId,
              categoryId,
            });
            if (!result.ok) {
              toast.error(result.error);
              setConfirm(false);
              return;
            }
            toast.success("Categoría archivada");
            invalidateNewTransactionFormOptions();
            onDone();
          });
        }}
      >
        Archivar
      </Button>
    </div>
  );
}
