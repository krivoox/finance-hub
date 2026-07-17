"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { upsertConsolidationRateAction } from "@/features/currency-exchange/actions";
import { rateScaledToArsPerUsd } from "@/features/dashboard/domain";
import {
  FormActions,
  FormField,
  FormStack,
} from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FormValues = {
  arsPerUsd: string;
  label: string;
  asOf: string;
};

type ConsolidationRateFormProps = {
  workspaceId: string;
  canMutate: boolean;
  initial?: {
    rateScaled: number;
    scale: number;
    label: string;
    asOf: Date;
  } | null;
};

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function asOfToIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function ConsolidationRateForm({
  workspaceId,
  canMutate,
  initial,
}: ConsolidationRateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const defaultArs =
    initial != null
      ? String(rateScaledToArsPerUsd(initial.rateScaled, initial.scale))
      : "";

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      arsPerUsd: defaultArs,
      label: initial?.label ?? "Manual",
      asOf: initial ? asOfToIsoDate(initial.asOf) : todayIsoDate(),
    },
  });

  const onSubmit = handleSubmit((values) => {
    const arsPerUsd = Number(values.arsPerUsd.replace(",", "."));
    if (!Number.isFinite(arsPerUsd) || arsPerUsd <= 0) {
      toast.error("Indicá cuántos ARS vale 1 USD");
      return;
    }

    startTransition(async () => {
      const result = await upsertConsolidationRateAction({
        workspaceId,
        arsPerUsd,
        quoteCurrency: "USD",
        label: values.label.trim() || "Manual",
        asOf: values.asOf,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Tasa de consolidación guardada");
      router.refresh();
    });
  });

  const isBusy = isPending || isSubmitting;

  return (
    <form className="flex max-w-md flex-col gap-4" onSubmit={onSubmit} noValidate>
      <FormStack>
        <FormField
          label="1 USD = … ARS"
          htmlFor="fx-rate"
          hint="Tasa manual para estimar el patrimonio consolidado"
        >
          <Input
            id="fx-rate"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="1400"
            className="tabular-nums"
            disabled={!canMutate || isBusy}
            {...register("arsPerUsd", { required: true })}
          />
        </FormField>

        <FormField label="Etiqueta" htmlFor="fx-label">
          <Input
            id="fx-label"
            placeholder="Manual, MEP, Blue…"
            disabled={!canMutate || isBusy}
            {...register("label")}
          />
        </FormField>

        <FormField label="Vigente desde" htmlFor="fx-asof">
          <Input
            id="fx-asof"
            type="date"
            disabled={!canMutate || isBusy}
            {...register("asOf", { required: true })}
          />
        </FormField>
      </FormStack>

      {canMutate ? (
        <FormActions>
          <Button
            type="submit"
            className="h-10 w-full sm:h-8 sm:w-auto"
            disabled={isBusy}
          >
            {isBusy ? "Guardando..." : "Guardar tasa"}
          </Button>
        </FormActions>
      ) : (
        <p className="text-xs text-muted-foreground">
          Solo miembros con permiso de edición pueden cambiar la tasa.
        </p>
      )}
    </form>
  );
}
