"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { ACCOUNT_CURRENCIES } from "@/domain/money/currencies";
import { createGoalAction } from "@/features/goals/actions";
import {
  createGoalSchema,
  type CreateGoalInput,
} from "@/features/goals/schemas";
import { GOAL_KINDS, type GoalKind } from "@/features/goals/domain";
import {
  FormActions,
  FormField,
  FormStack,
  SegmentedControl,
} from "@/components/form-sheet";
import { DateField } from "@/components/date-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { refreshAfterMutation } from "@/lib/navigation";
import {
  AccountChoiceList,
  type GoalAccountOption,
} from "./account-choice-list";
import { GOAL_KIND_LABEL_ES } from "./goal-kind-labels";

type NewGoalFormProps = {
  workspaceId: string;
  workspaceCurrency: string;
  accounts: readonly GoalAccountOption[];
  onSuccess?: () => void;
  onCancel?: () => void;
};

type FormValues = {
  name: string;
  kind: GoalKind;
  targetAmountUnits: string;
  currency: (typeof ACCOUNT_CURRENCIES)[number];
  targetDate: string;
  linkedAccountId: string;
};

const KIND_OPTIONS = GOAL_KINDS.map((value) => ({
  value,
  label: GOAL_KIND_LABEL_ES[value],
}));

const CURRENCY_OPTIONS = ACCOUNT_CURRENCIES.map((value) => ({
  value,
  label: value,
}));

export function NewGoalForm({
  workspaceId,
  workspaceCurrency,
  accounts,
  onSuccess,
  onCancel,
}: NewGoalFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const defaultCurrency =
    workspaceCurrency === "USD" || workspaceCurrency === "ARS"
      ? workspaceCurrency
      : "ARS";

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      kind: "save",
      targetAmountUnits: "",
      currency: defaultCurrency,
      targetDate: "",
      linkedAccountId: "",
    },
  });

  const selectedCurrency = useWatch({ control, name: "currency" });
  const selectedKind = useWatch({ control, name: "kind" });
  const linkedAccountId = useWatch({ control, name: "linkedAccountId" });

  const linkedAccounts = useMemo(
    () => accounts.filter((a) => a.currency === selectedCurrency),
    [accounts, selectedCurrency],
  );

  const onSubmit = handleSubmit((values) => {
    const parsedUnits = Number(values.targetAmountUnits.replace(",", "."));
    if (!Number.isFinite(parsedUnits) || parsedUnits <= 0) {
      toast.error("Monto objetivo inválido");
      return;
    }
    const targetAmountCents = Math.round(parsedUnits * 100);
    if (!Number.isInteger(targetAmountCents) || targetAmountCents <= 0) {
      toast.error("Monto objetivo inválido");
      return;
    }

    const input: CreateGoalInput = {
      workspaceId,
      name: values.name,
      kind: values.kind,
      targetAmountCents,
      currency: values.currency,
      targetDate: values.targetDate.trim() ? values.targetDate : null,
      linkedAccountId: values.linkedAccountId ? values.linkedAccountId : null,
    };

    const clientCheck = createGoalSchema.safeParse(input);
    if (!clientCheck.success) {
      toast.error(clientCheck.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    startTransition(async () => {
      const result = await createGoalAction(clientCheck.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Objetivo creado");
      reset({
        name: "",
        kind: values.kind,
        targetAmountUnits: "",
        currency: values.currency,
        targetDate: "",
        linkedAccountId: "",
      });
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
          htmlFor="goal-name"
          error={errors.name?.message}
        >
          <Input
            id="goal-name"
            placeholder="Fondo de emergencia, Viaje…"
            aria-invalid={Boolean(errors.name)}
            {...register("name", { required: "Nombre requerido" })}
          />
        </FormField>

        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <FormField label="Tipo" htmlFor="goal-kind">
              <SegmentedControl
                id="goal-kind"
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
          htmlFor="goal-target"
          hint="Monto meta"
        >
          <Input
            id="goal-target"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0,00"
            className="tabular-nums"
            aria-invalid={Boolean(errors.targetAmountUnits)}
            {...register("targetAmountUnits", { required: true })}
          />
        </FormField>

        <Controller
          control={control}
          name="currency"
          render={({ field }) => (
            <FormField
              label="Moneda"
              htmlFor="goal-currency"
              hint="Tiene que coincidir con la cuenta vinculada."
            >
              <SegmentedControl
                id="goal-currency"
                ariaLabel="Moneda del objetivo"
                value={field.value}
                options={CURRENCY_OPTIONS}
                disabled={isBusy}
                onChange={(next) => {
                  field.onChange(next);
                  const stillValid = accounts.some(
                    (a) => a.id === linkedAccountId && a.currency === next,
                  );
                  if (!stillValid) setValue("linkedAccountId", "");
                }}
              />
            </FormField>
          )}
        />

        <FormField label="Fecha meta" htmlFor="goal-target-date" optional>
          <Controller
            control={control}
            name="targetDate"
            render={({ field }) => (
              <DateField
                id="goal-target-date"
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
              htmlFor="goal-linked-account"
              optional
              hint={linkedHint}
            >
              <AccountChoiceList
                id="goal-linked-account"
                accounts={linkedAccounts}
                value={field.value}
                onChange={field.onChange}
                disabled={isBusy}
                noneLabel="Sin vincular (después no vas a poder aportar)"
                emptyLabel={`No hay cuentas en ${selectedCurrency}. Creá una en Cuentas.`}
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
          {isBusy ? "Creando..." : "Crear objetivo"}
        </Button>
      </FormActions>
    </form>
  );
}
