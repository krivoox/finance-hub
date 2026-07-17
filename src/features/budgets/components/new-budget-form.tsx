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
import {
  FormActions,
  FormField,
  FormSection,
  FormStack,
} from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nativeSelectClassName } from "@/components/ui/native-select";
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
  currency: "ARS" | "USD";
  categoryIds: string[];
};

const SELECT_CLASSES = nativeSelectClassName;

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
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function NewBudgetForm({
  workspaceId,
  workspaceCurrency,
  categories,
  onSuccess,
  onCancel,
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
      currency:
        workspaceCurrency === "USD" || workspaceCurrency === "ARS"
          ? workspaceCurrency
          : "ARS",
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
        currency: values.currency,
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
        currency: values.currency,
        categoryIds: [],
      });
      router.refresh();
      onSuccess?.();
    });
  });

  const isBusy = isPending || isSubmitting;

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FormStack>
        <FormSection>
          <FormField
            label="Nombre"
            htmlFor="budget-name"
            error={errors.name?.message}
          >
            <Input
              id="budget-name"
              placeholder="Comida, Transporte, Ocio…"
              aria-invalid={Boolean(errors.name)}
              {...register("name", { required: "Nombre requerido" })}
            />
          </FormField>

          <FormField label="Periodo" htmlFor="budget-period">
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
          </FormField>

          <FormField
            label="Límite"
            htmlFor="budget-limit"
            hint="Monto máximo del periodo"
          >
            <Input
              id="budget-limit"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="0,00"
              className="tabular-nums"
              aria-invalid={Boolean(errors.limitUnits)}
              {...register("limitUnits", { required: true })}
            />
          </FormField>

          <FormField label="Moneda" htmlFor="budget-currency">
            <select
              id="budget-currency"
              className={SELECT_CLASSES}
              {...register("currency")}
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </FormField>
        </FormSection>

        <FormSection title="Vigencia">
          <FormField label="Inicio" htmlFor="budget-start">
            <Input
              id="budget-start"
              type="date"
              aria-invalid={Boolean(errors.startDate)}
              {...register("startDate", { required: true })}
            />
          </FormField>

          {showEndDate ? (
            <FormField label="Fin" htmlFor="budget-end">
              <Input
                id="budget-end"
                type="date"
                aria-invalid={Boolean(errors.endDate)}
                {...register("endDate", { required: showEndDate })}
              />
            </FormField>
          ) : null}

          <FormField
            label="Categorías"
            htmlFor="budget-categories"
            optional
            hint="Vacío = todas las de gasto. En móvil tocá y mantené para multi-selección."
          >
            <select
              id="budget-categories"
              multiple
              className="flex min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register("categoryIds")}
            >
              {sortedCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
        </FormSection>
      </FormStack>

      <FormActions>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full sm:h-8 sm:w-auto"
            disabled={isBusy}
            onClick={onCancel}
          >
            Cancelar
          </Button>
        ) : null}
        <Button
          type="submit"
          className="h-10 w-full sm:h-8 sm:w-auto"
          disabled={isBusy}
        >
          {isBusy ? "Creando..." : "Crear presupuesto"}
        </Button>
      </FormActions>
    </form>
  );
}
