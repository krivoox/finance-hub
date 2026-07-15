"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createGoalAction } from "@/features/goals/actions";
import {
  createGoalSchema,
  type CreateGoalInput,
} from "@/features/goals/schemas";
import { GOAL_KINDS, type GoalKind } from "@/features/goals/domain";
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
};

type FormValues = {
  name: string;
  kind: GoalKind;
  targetAmountUnits: string;
  targetDate: string;
  linkedAccountId: string;
};

const SELECT_CLASSES = nativeSelectClassName;

export function NewGoalForm({
  workspaceId,
  workspaceCurrency,
  accounts,
}: NewGoalFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
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
    });
  });

  const isBusy = isPending || isSubmitting;

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,160px)_minmax(0,180px)]">
        <div className="space-y-2">
          <label
            htmlFor="goal-name"
            className="text-sm font-medium text-muted-foreground"
          >
            Nombre
          </label>
          <Input
            id="goal-name"
            placeholder="Fondo de emergencia, Viaje, Tarjeta VISA…"
            aria-invalid={Boolean(errors.name)}
            {...register("name", { required: "Nombre requerido" })}
          />
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="goal-kind"
            className="text-sm font-medium text-muted-foreground"
          >
            Tipo
          </label>
          <select id="goal-kind" className={SELECT_CLASSES} {...register("kind")}>
            {GOAL_KINDS.map((k) => (
              <option key={k} value={k}>
                {GOAL_KIND_LABEL_ES[k]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="goal-target"
            className="text-sm font-medium text-muted-foreground"
          >
            Objetivo ({workspaceCurrency})
          </label>
          <Input
            id="goal-target"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0,00"
            aria-invalid={Boolean(errors.targetAmountUnits)}
            {...register("targetAmountUnits", { required: true })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
        <div className="space-y-2">
          <label
            htmlFor="goal-target-date"
            className="text-sm font-medium text-muted-foreground"
          >
            Fecha meta (opcional)
          </label>
          <Input
            id="goal-target-date"
            type="date"
            {...register("targetDate")}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="goal-linked-account"
            className="text-sm font-medium text-muted-foreground"
          >
            Cuenta vinculada (opcional)
          </label>
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
        </div>
      </div>

      <div className="flex justify-stretch sm:justify-end">
        <Button
          type="submit"
          className="h-10 w-full sm:h-8 sm:w-auto"
          disabled={isBusy}
        >
          {isBusy ? "Creando..." : "Crear objetivo"}
        </Button>
      </div>
    </form>
  );
}
