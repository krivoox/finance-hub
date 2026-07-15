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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ContributeGoalFormProps = {
  goalId: string;
  goalCurrency: string;
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
    });
  });

  const isBusy = isPending || isSubmitting;

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={onSubmit}
      noValidate
    >
      <div className="w-full sm:w-40 space-y-1">
        <label
          htmlFor={`contribute-amount-${goalId}`}
          className="text-xs font-medium text-muted-foreground"
        >
          Aporte ({goalCurrency})
        </label>
        <Input
          id={`contribute-amount-${goalId}`}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          placeholder="0,00"
          aria-invalid={Boolean(errors.amountUnits)}
          {...register("amountUnits", { required: true })}
        />
      </div>
      <div className="w-full sm:w-40 space-y-1">
        <label
          htmlFor={`contribute-date-${goalId}`}
          className="text-xs font-medium text-muted-foreground"
        >
          Fecha
        </label>
        <Input
          id={`contribute-date-${goalId}`}
          type="date"
          {...register("contributedOn", { required: true })}
        />
      </div>
      <div className="w-full flex-1 space-y-1">
        <label
          htmlFor={`contribute-note-${goalId}`}
          className="text-xs font-medium text-muted-foreground"
        >
          Nota (opcional)
        </label>
        <Input
          id={`contribute-note-${goalId}`}
          placeholder="Aguinaldo, transferencia, ahorro extra…"
          {...register("note")}
        />
      </div>
      <Button
        type="submit"
        className="h-10 w-full shrink-0 sm:h-8 sm:w-auto"
        disabled={isBusy}
      >
        {isBusy ? "Registrando..." : "Aportar"}
      </Button>
    </form>
  );
}
