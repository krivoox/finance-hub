"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { contributeToGoalAction } from "@/features/goals/actions";
import {
  contributeToGoalSchema,
  type ContributeToGoalInput,
} from "@/features/goals/schemas";
import {
  FormActions,
  FormField,
  FormStack,
} from "@/components/form-sheet";
import { AmountInput } from "@/components/amount-input";
import { DateField } from "@/components/date-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseAmountCents } from "@/domain/money/parse-amount";
import { refreshAfterMutation } from "@/lib/navigation";
import {
  AccountChoiceList,
  type GoalAccountOption,
} from "./account-choice-list";

type ContributeGoalFormProps = {
  goalId: string;
  goalCurrency: string;
  linkedAccountId: string | null;
  linkedAccountName: string | null;
  accounts: readonly GoalAccountOption[];
  onSuccess?: () => void;
  onCancel?: () => void;
};

type FormValues = {
  fromAccountId: string;
  amountUnits: string;
  contributedOn: string;
  note: string;
};

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function ContributeGoalForm({
  goalId,
  goalCurrency,
  linkedAccountId,
  linkedAccountName,
  accounts,
  onSuccess,
  onCancel,
}: ContributeGoalFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const originAccounts = accounts.filter(
    (a) => a.currency === goalCurrency && a.id !== linkedAccountId,
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      fromAccountId: originAccounts[0]?.id ?? "",
      amountUnits: "",
      contributedOn: todayIsoDate(),
      note: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    if (!linkedAccountId) {
      toast.error(
        "Este objetivo no tiene cuenta vinculada. Editá el objetivo antes de aportar.",
      );
      return;
    }

    const amountCents = parseAmountCents(values.amountUnits);
    if (amountCents === null) {
      toast.error("Aporte inválido");
      return;
    }

    const input: ContributeToGoalInput = {
      goalId,
      fromAccountId: values.fromAccountId,
      amountCents,
      contributedOn: values.contributedOn,
      note: values.note.trim() ? values.note.trim() : null,
    };

    const clientCheck = contributeToGoalSchema.safeParse(input);
    if (!clientCheck.success) {
      toast.error(clientCheck.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    startTransition(async () => {
      const result = await contributeToGoalAction(clientCheck.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.data.goalStatus === "completed"
          ? "Aporte registrado, objetivo completado"
          : "Aporte registrado",
      );
      reset({
        fromAccountId: values.fromAccountId,
        amountUnits: "",
        contributedOn: values.contributedOn,
        note: "",
      });
      onSuccess?.();
      refreshAfterMutation(router);
    });
  });

  const isBusy = isPending || isSubmitting;
  const canContribute = Boolean(linkedAccountId) && originAccounts.length > 0;

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FormStack>
        {!linkedAccountId ? (
          <p className="text-sm text-muted-foreground">
            Vinculá una cuenta al objetivo (Editar) para poder aportar. El
            dinero se transfiere hacia esa cuenta.
          </p>
        ) : null}

        <Controller
          control={control}
          name="fromAccountId"
          rules={{ required: true }}
          render={({ field }) => (
            <FormField
              label="Sale de"
              htmlFor={`contribute-from-${goalId}`}
            >
              <AccountChoiceList
                id={`contribute-from-${goalId}`}
                accounts={originAccounts}
                value={field.value}
                onChange={field.onChange}
                disabled={!canContribute || isBusy}
                emptyLabel={
                  linkedAccountId
                    ? `No hay otra cuenta en ${goalCurrency} para sacar el dinero.`
                    : "Primero vinculá una cuenta al objetivo."
                }
              />
            </FormField>
          )}
        />

        <FormField label="Entra en" htmlFor={`contribute-to-${goalId}`}>
          <Input
            id={`contribute-to-${goalId}`}
            value={linkedAccountName ?? "Sin cuenta vinculada"}
            readOnly
            disabled
            className="bg-muted"
          />
        </FormField>

        <FormField
          label="Aporte"
          htmlFor={`contribute-amount-${goalId}`}
          hint={`En ${goalCurrency}`}
        >
          <AmountInput
            id={`contribute-amount-${goalId}`}
            disabled={!canContribute}
            aria-invalid={Boolean(errors.amountUnits)}
            {...register("amountUnits", { required: true })}
          />
        </FormField>

        <FormField label="Fecha" htmlFor={`contribute-date-${goalId}`}>
          <Controller
            control={control}
            name="contributedOn"
            rules={{ required: true }}
            render={({ field }) => (
              <DateField
                id={`contribute-date-${goalId}`}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={!canContribute}
                invalid={Boolean(errors.contributedOn)}
              />
            )}
          />
        </FormField>

        <FormField
          label="Nota"
          htmlFor={`contribute-note-${goalId}`}
          optional
        >
          <Input
            id={`contribute-note-${goalId}`}
            placeholder="Aguinaldo, transferencia…"
            disabled={!canContribute}
            {...register("note")}
          />
        </FormField>
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
          disabled={isBusy || !canContribute}
        >
          {isBusy ? "Registrando..." : "Aportar"}
        </Button>
      </FormActions>
    </form>
  );
}
