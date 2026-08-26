"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateBudgetAction } from "@/features/budgets/actions";
import { CategoryPicker } from "@/features/categories/components/category-picker";
import {
  FormActions,
  FormField,
  FormSection,
  FormStack,
} from "@/components/form-sheet";
import { AmountInput } from "@/components/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatCentsAsAmountInput,
  parseAmountCents,
} from "@/domain/money/parse-amount";
import { refreshAfterMutation } from "@/lib/navigation";

type CategoryOption = {
  id: string;
  name: string;
};

type FormValues = {
  name: string;
  limitUnits: string;
  categoryIds: string[];
};

type EditBudgetFormProps = {
  budgetId: string;
  name: string;
  limitCents: number;
  currency: string;
  categoryIds: readonly string[];
  categories: readonly CategoryOption[];
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function EditBudgetForm({
  budgetId,
  name,
  limitCents,
  currency,
  categoryIds,
  categories,
  onSuccess,
  onCancel,
}: EditBudgetFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name,
      limitUnits: formatCentsAsAmountInput(limitCents),
      categoryIds: [...categoryIds],
    },
  });

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [categories],
  );

  const onSubmit = handleSubmit((values) => {
    const nextLimitCents = parseAmountCents(values.limitUnits);
    if (nextLimitCents === null) {
      toast.error("El límite debe ser mayor a 0");
      return;
    }

    const trimmedName = values.name.trim();
    if (!trimmedName) {
      toast.error("El nombre es obligatorio");
      return;
    }

    startTransition(async () => {
      const result = await updateBudgetAction({
        budgetId,
        name: trimmedName,
        limitCents: nextLimitCents,
        categoryIds: values.categoryIds ?? [],
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Presupuesto actualizado");
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
            htmlFor="edit-budget-name"
            error={errors.name?.message}
          >
            <Input
              id="edit-budget-name"
              placeholder="Comida, Transporte, Ocio…"
              aria-invalid={Boolean(errors.name)}
              {...register("name", { required: "Nombre requerido" })}
            />
          </FormField>

          <FormField
            label="Límite"
            htmlFor="edit-budget-limit"
            hint={`Monto máximo del periodo (${currency})`}
          >
            <AmountInput
              id="edit-budget-limit"
              aria-invalid={Boolean(errors.limitUnits)}
              {...register("limitUnits", { required: true })}
            />
          </FormField>

          <FormField
            label="Categorías"
            htmlFor="edit-budget-categories"
            optional
            hint="Vacío = todas las de gasto."
          >
            <Controller
              control={control}
              name="categoryIds"
              render={({ field }) => (
                <CategoryPicker
                  mode="multi"
                  id="edit-budget-categories"
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
          {isBusy ? "Guardando..." : "Guardar cambios"}
        </Button>
      </FormActions>
    </form>
  );
}
