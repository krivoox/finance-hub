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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  archiveCategoryAction,
  createCategoryAction,
  renameCategoryAction,
} from "@/features/categories/actions";
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground text-pretty">
            Categorías de <span className="text-foreground">{workspaceName}</span>
            . Se usan en movimientos, presupuestos y analytics.
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
              <Button className="h-10 w-full gap-1.5 sm:h-8 sm:w-auto">
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
                router.refresh();
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
        <p className="text-sm text-muted-foreground">
          No hay categorías de {kind === "expense" ? "gasto" : "ingreso"}{" "}
          activas.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {active.map((category) => {
            const system = isSystemCategory(category.name, category.kind);
            return (
              <li
                key={category.id}
                className="flex items-center justify-between gap-3 px-3 py-3"
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
                      onDone={() => router.refresh()}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {archived.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Archivadas
          </h3>
          <ul className="divide-y divide-border rounded-lg border border-dashed border-border">
            {archived.map((category) => (
              <li
                key={category.id}
                className="px-3 py-2.5 text-sm text-muted-foreground"
              >
                {category.name}
              </li>
            ))}
          </ul>
        </section>
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
              router.refresh();
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
          className="h-10 w-full sm:h-8 sm:w-auto"
          disabled={isPending}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="h-10 w-full sm:h-8 sm:w-auto"
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
          className="h-10 w-full sm:h-8 sm:w-auto"
          disabled={isPending}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="h-10 w-full sm:h-8 sm:w-auto"
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
            onDone();
          });
        }}
      >
        Archivar
      </Button>
    </div>
  );
}
