"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { createBudgetAction } from "@/features/budgets/actions";
import {
  BUDGET_PERIODS,
  type BudgetPeriod,
} from "@/features/budgets/domain";
import { CategoryPicker } from "@/features/categories/components/category-picker";
import {
  FormActions,
  FormField,
  FormSection,
  FormStack,
} from "@/components/form-sheet";
import { AmountInput } from "@/components/amount-input";
import { DateField } from "@/components/date-field";
import { Button } from "@/components/ui/button";
import { refreshAfterMutation } from "@/lib/navigation";
import { Input } from "@/components/ui/input";
import { parseAmountCents } from "@/domain/money/parse-amount";
import { FormSelect } from "@/components/ui/select";
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
    const limitCents = parseAmountCents(values.limitUnits);
    if (limitCents === null) {
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
      onSuccess?.();
      refreshAfterMutation(router);
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
            <FormSelect
              control={control}
              name="period"
              id="budget-period"
              options={BUDGET_PERIODS.map((p) => ({
                value: p,
                label: BUDGET_PERIOD_LABEL_ES[p],
              }))}
            />
          </FormField>

          <FormField
            label="Límite"
            htmlFor="budget-limit"
            hint="Monto máximo del periodo"
          >
            <AmountInput
              id="budget-limit"
              aria-invalid={Boolean(errors.limitUnits)}
              {...register("limitUnits", { required: true })}
            />
          </FormField>

          <FormField label="Moneda" htmlFor="budget-currency">
            <FormSelect
              control={control}
              name="currency"
              id="budget-currency"
              options={[
                { value: "ARS", label: "ARS" },
                { value: "USD", label: "USD" },
              ]}
            />
          </FormField>
        </FormSection>

        <FormSection title="Vigencia">
          <FormField label="Inicio" htmlFor="budget-start">
            <Controller
              control={control}
              name="startDate"
              rules={{ required: true }}
              render={({ field }) => (
                <DateField
                  id="budget-start"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={Boolean(errors.startDate)}
                />
              )}
            />
          </FormField>

          {showEndDate ? (
            <FormField label="Fin" htmlFor="budget-end">
              <Controller
                control={control}
                name="endDate"
                rules={{ required: showEndDate }}
                render={({ field }) => (
                  <DateField
                    id="budget-end"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    invalid={Boolean(errors.endDate)}
                  />
                )}
              />
            </FormField>
          ) : null}

          <FormField
            label="Categorías"
            htmlFor="budget-categories"
            optional
            hint="Vacío = todas las de gasto."
          >
            <Controller
              control={control}
              name="categoryIds"
              render={({ field }) => (
                <CategoryPicker
                  mode="multi"
                  id="budget-categories"
                  categories={sortedCategories}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isBusy}
                />
              )}
            />
          </FormField>
        </FormSection>
      </FormStack>

      <FormActions>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isBusy}
            onClick={onCancel}
          >
            Cancelar
          </Button>
        ) : null}
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={isBusy}
        >
          {isBusy ? "Creando..." : "Crear presupuesto"}
        </Button>
      </FormActions>
    </form>
  );
}
