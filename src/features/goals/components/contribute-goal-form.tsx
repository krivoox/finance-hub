"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ContributeGoalFormProps = {
  goalId: string;
  goalCurrency: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

type FormValues = {
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
  onSuccess,
  onCancel,
}: ContributeGoalFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      amountUnits: "",
      contributedOn: todayIsoDate(),
      note: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    const parsedUnits = Number(values.amountUnits.replace(",", "."));
    if (!Number.isFinite(parsedUnits) || parsedUnits <= 0) {
      toast.error("Aporte inválido");
      return;
    }
    const amountCents = Math.round(parsedUnits * 100);
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      toast.error("Aporte inválido");
      return;
    }

    const input: ContributeToGoalInput = {
      goalId,
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
        amountUnits: "",
        contributedOn: values.contributedOn,
        note: "",
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
          label="Aporte"
          htmlFor={`contribute-amount-${goalId}`}
          hint={`En ${goalCurrency}`}
        >
          <Input
            id={`contribute-amount-${goalId}`}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0,00"
            className="tabular-nums"
            aria-invalid={Boolean(errors.amountUnits)}
            {...register("amountUnits", { required: true })}
          />
        </FormField>

        <FormField label="Fecha" htmlFor={`contribute-date-${goalId}`}>
          <Input
            id={`contribute-date-${goalId}`}
            type="date"
            {...register("contributedOn", { required: true })}
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
            {...register("note")}
          />
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
          {isBusy ? "Registrando..." : "Aportar"}
        </Button>
      </FormActions>
    </form>
  );
}
