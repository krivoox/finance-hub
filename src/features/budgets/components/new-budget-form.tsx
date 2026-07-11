"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { createBudgetAction } from "@/features/budgets/actions";
import {
  BUDGET_PERIODS,
  type BudgetPeriod,
} from "@/features/budgets/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BUDGET_PERIOD_LABEL_ES } from "./period-labels";

type CategoryOption = {
  id: string;
  name: string;
};

type FormValues = {
  name: string;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  limitUnits: string;
  categoryIds: string[];
};

const SELECT_CLASSES =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type NewBudgetFormProps = {
  workspaceId: string;
  workspaceCurrency: string;
  categories: readonly CategoryOption[];
};

export function NewBudgetForm({
  workspaceId,
  workspaceCurrency,
  categories,
}: NewBudgetFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      period: "monthly",
      startDate: todayIsoDate(),
      endDate: "",
      limitUnits: "",
      categoryIds: [],
    },
  });

  const watchedPeriod = useWatch({ control, name: "period" });
  const showEndDate = watchedPeriod === "custom";

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [categories],
  );

  const onSubmit = handleSubmit((values) => {
    const parsedUnits = Number(values.limitUnits.replace(",", "."));
    if (!Number.isFinite(parsedUnits) || parsedUnits <= 0) {
      toast.error("El límite debe ser mayor a 0");
      return;
    }
    const limitCents = Math.round(parsedUnits * 100);
    if (!Number.isInteger(limitCents) || limitCents <= 0) {
      toast.error("El límite debe ser mayor a 0");
      return;
    }

    const trimmedName = values.name.trim();
    if (!trimmedName) {
      toast.error("El nombre es obligatorio");
      return;
    }

    startTransition(async () => {
      const result = await createBudgetAction({
        workspaceId,
        name: trimmedName,
        period: values.period,
        startDate: values.startDate,
        endDate:
          values.period === "custom"
            ? values.endDate || undefined
            : undefined,
        limitCents,
        categoryIds: values.categoryIds ?? [],
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Presupuesto creado");
      reset({
        name: "",
        period: values.period,
        startDate: values.startDate,
        endDate: "",
        limitUnits: "",
        categoryIds: [],
      });
      router.refresh();
    });
  });

  const isBusy = isPending || isSubmitting;

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,180px)_minmax(0,180px)]">
        <div className="space-y-2">
          <label
            htmlFor="budget-name"
            className="text-sm font-medium text-muted-foreground"
          >
            Nombre
          </label>
          <Input
            id="budget-name"
            placeholder="Comida, Transporte, Ocio…"
            aria-invalid={Boolean(errors.name)}
            {...register("name", { required: "Nombre requerido" })}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="budget-period"
            className="text-sm font-medium text-muted-foreground"
          >
            Periodo
          </label>
          <select
            id="budget-period"
            className={SELECT_CLASSES}
            {...register("period")}
          >
            {BUDGET_PERIODS.map((p) => (
              <option key={p} value={p}>
                {BUDGET_PERIOD_LABEL_ES[p]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="budget-limit"
            className="text-sm font-medium text-muted-foreground"
          >
            Límite ({workspaceCurrency})
          </label>
          <Input
            id="budget-limit"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0,00"
            aria-invalid={Boolean(errors.limitUnits)}
            {...register("limitUnits", { required: true })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,180px)_minmax(0,180px)_minmax(0,1fr)]">
        <div className="space-y-2">
          <label
            htmlFor="budget-start"
            className="text-sm font-medium text-muted-foreground"
          >
            Inicio
          </label>
          <Input
            id="budget-start"
            type="date"
            aria-invalid={Boolean(errors.startDate)}
            {...register("startDate", { required: true })}
          />
        </div>

        {showEndDate ? (
          <div className="space-y-2">
            <label
              htmlFor="budget-end"
              className="text-sm font-medium text-muted-foreground"
            >
              Fin
            </label>
            <Input
              id="budget-end"
              type="date"
              aria-invalid={Boolean(errors.endDate)}
              {...register("endDate", { required: showEndDate })}
            />
          </div>
        ) : (
          <div />
        )}

        <div className="space-y-2">
          <label
            htmlFor="budget-categories"
            className="text-sm font-medium text-muted-foreground"
          >
            Categorías (opcional — vacío = todas)
          </label>
          <select
            id="budget-categories"
            multiple
            className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            {...register("categoryIds")}
          >
            {sortedCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isBusy}>
          {isBusy ? "Creando..." : "Crear presupuesto"}
        </Button>
      </div>
    </form>
  );
}
