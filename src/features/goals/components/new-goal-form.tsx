"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nativeSelectClassName } from "@/components/ui/native-select";
import { GOAL_KIND_LABEL_ES } from "./goal-kind-labels";

type AccountOption = {
  id: string;
  name: string;
};

type NewGoalFormProps = {
  workspaceId: string;
  workspaceCurrency: string;
  accounts: readonly AccountOption[];
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

const SELECT_CLASSES = nativeSelectClassName;

const KIND_OPTIONS = GOAL_KINDS.map((value) => ({
  value,
  label: GOAL_KIND_LABEL_ES[value],
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
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      kind: "save",
      targetAmountUnits: "",
      targetDate: "",
      linkedAccountId: "",
    },
  });

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
        targetDate: "",
        linkedAccountId: "",
      });
      router.refresh();
      onSuccess?.();
    });
  });

  const isBusy = isPending || isSubmitting;

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
          hint={`En ${workspaceCurrency}`}
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

        <FormField label="Fecha meta" htmlFor="goal-target-date" optional>
          <Input
            id="goal-target-date"
            type="date"
            {...register("targetDate")}
          />
        </FormField>

        <FormField
          label="Cuenta vinculada"
          htmlFor="goal-linked-account"
          optional
        >
          <select
            id="goal-linked-account"
            className={SELECT_CLASSES}
            {...register("linkedAccountId")}
          >
            <option value="">Sin vincular</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </FormField>
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
          {isBusy ? "Creando..." : "Crear objetivo"}
        </Button>
      </FormActions>
    </form>
  );
}
