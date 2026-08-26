"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { updateGoalAction } from "@/features/goals/actions";
import {
  updateGoalSchema,
  type UpdateGoalInput,
} from "@/features/goals/schemas";
import { GOAL_KINDS, type GoalKind } from "@/features/goals/domain";
import {
  FormActions,
  FormField,
  FormStack,
  SegmentedControl,
} from "@/components/form-sheet";
import { AmountInput } from "@/components/amount-input";
import { DateField } from "@/components/date-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatCentsAsAmountInput,
  parseAmountCents,
} from "@/domain/money/parse-amount";
import { refreshAfterMutation } from "@/lib/navigation";
import {
  AccountChoiceList,
  type GoalAccountOption,
} from "./account-choice-list";
import { GOAL_KIND_LABEL_ES } from "./goal-kind-labels";

type EditGoalFormProps = {
  goal: {
    id: string;
    name: string;
    kind: GoalKind;
    targetAmountCents: number;
    currentAmountCents: number;
    currency: string;
    targetDate: string | null;
    linkedAccountId: string | null;
  };
  accounts: readonly GoalAccountOption[];
  onSuccess?: () => void;
  onCancel?: () => void;
};

type FormValues = {
  name: string;
  kind: GoalKind;
  targetAmountUnits: string;
  targetDate: string;
  linkedAccountId: string;
};

const KIND_OPTIONS = GOAL_KINDS.map((value) => ({
  value,
  label: GOAL_KIND_LABEL_ES[value],
}));

export function EditGoalForm({
  goal,
  accounts,
  onSuccess,
  onCancel,
}: EditGoalFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: goal.name,
      kind: goal.kind,
      targetAmountUnits: formatCentsAsAmountInput(goal.targetAmountCents),
      targetDate: goal.targetDate ?? "",
      linkedAccountId: goal.linkedAccountId ?? "",
    },
  });

  const selectedKind = useWatch({ control, name: "kind" });

  const linkedAccounts = useMemo(
    () => accounts.filter((a) => a.currency === goal.currency),
    [accounts, goal.currency],
  );

  const onSubmit = handleSubmit((values) => {
    const targetAmountCents = parseAmountCents(values.targetAmountUnits);
    if (targetAmountCents === null) {
      toast.error("Monto objetivo inválido");
      return;
    }

    const input: UpdateGoalInput = {
      goalId: goal.id,
      name: values.name,
      kind: values.kind,
      targetAmountCents,
      targetDate: values.targetDate.trim() ? values.targetDate : null,
      linkedAccountId: values.linkedAccountId ? values.linkedAccountId : null,
    };

    const clientCheck = updateGoalSchema.safeParse(input);
    if (!clientCheck.success) {
      toast.error(clientCheck.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    startTransition(async () => {
      const result = await updateGoalAction(clientCheck.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Objetivo actualizado");
      onSuccess?.();
      refreshAfterMutation(router);
    });
  });

  const isBusy = isPending || isSubmitting;
  const linkedHint =
    selectedKind === "debt_payoff"
      ? "Destino de cada aporte. En pago de deuda suele ser la tarjeta."
      : "Destino de cada aporte. En ahorro suele ser una caja o fondo.";

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FormStack>
        <FormField
          label="Nombre"
          htmlFor="edit-goal-name"
          error={errors.name?.message}
        >
          <Input
            id="edit-goal-name"
            aria-invalid={Boolean(errors.name)}
            {...register("name", { required: "Nombre requerido" })}
          />
        </FormField>

        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <FormField label="Tipo" htmlFor="edit-goal-kind">
              <SegmentedControl
                id="edit-goal-kind"
                ariaLabel="Tipo de objetivo"
                value={field.value}
                options={KIND_OPTIONS}
                disabled={isBusy}
                onChange={field.onChange}
              />
            </FormField>
          )}
        />

        <FormField
          label="Objetivo"
          htmlFor="edit-goal-target"
          hint={`En ${goal.currency}. Si el nuevo monto es menor o igual a lo aportado, se marca completado.`}
        >
          <AmountInput
            id="edit-goal-target"
            aria-invalid={Boolean(errors.targetAmountUnits)}
            {...register("targetAmountUnits", { required: true })}
          />
        </FormField>

        <FormField label="Moneda" htmlFor="edit-goal-currency">
          <Input
            id="edit-goal-currency"
            value={goal.currency}
            readOnly
            disabled
            className="bg-muted"
          />
        </FormField>

        <FormField label="Fecha meta" htmlFor="edit-goal-target-date" optional>
          <Controller
            control={control}
            name="targetDate"
            render={({ field }) => (
              <DateField
                id="edit-goal-target-date"
                name={field.name}
                clearable
                placeholder="Sin fecha"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </FormField>

        <Controller
          control={control}
          name="linkedAccountId"
          render={({ field }) => (
            <FormField
              label="Cuenta vinculada"
              htmlFor="edit-goal-linked-account"
              optional
              hint={linkedHint}
            >
              <AccountChoiceList
                id="edit-goal-linked-account"
                accounts={linkedAccounts}
                value={field.value}
                onChange={field.onChange}
                disabled={isBusy}
                noneLabel="Sin vincular (no vas a poder aportar)"
                emptyLabel={`No hay cuentas en ${goal.currency}. Creá una en Cuentas.`}
                kind={selectedKind}
              />
            </FormField>
          )}
        />
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
          {isBusy ? "Guardando..." : "Guardar"}
        </Button>
      </FormActions>
    </form>
  );
}
