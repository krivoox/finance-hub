"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { createCrossWorkspaceContributionAction } from "@/features/transactions/actions";
import {
  FormActions,
  FormField,
  FormStack,
} from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nativeSelectClassName } from "@/components/ui/native-select";

export type ContributionAccountOption = {
  id: string;
  name: string;
  currency: string;
  workspaceId: string;
  workspaceName: string;
  workspaceType: "personal" | "group";
};

type ContributeFormProps = {
  accounts: readonly ContributionAccountOption[];
  currencyHint: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

type FormValues = {
  sourceAccountId: string;
  targetAccountId: string;
  amountUnits: string;
  occurredOn: string;
  description: string;
};

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseAmountCents(raw: string): number | null {
  const parsedUnits = Number(raw.replace(",", "."));
  if (!Number.isFinite(parsedUnits) || parsedUnits <= 0) return null;
  const amountCents = Math.round(parsedUnits * 100);
  if (!Number.isInteger(amountCents) || amountCents <= 0) return null;
  return amountCents;
}

export function ContributeCrossWorkspaceForm({
  accounts,
  currencyHint,
  onSuccess,
  onCancel,
}: ContributeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const defaultSource = accounts[0]?.id ?? "";
  const defaultTarget =
    accounts.find((a) => a.workspaceId !== accounts[0]?.workspaceId)?.id ??
    accounts[1]?.id ??
    "";

  const { register, handleSubmit, control } = useForm<FormValues>({
    defaultValues: {
      sourceAccountId: defaultSource,
      targetAccountId: defaultTarget,
      amountUnits: "",
      occurredOn: todayIsoDate(),
      description: "",
    },
  });

  const sourceAccountId = useWatch({ control, name: "sourceAccountId" });
  const targetAccountId = useWatch({ control, name: "targetAccountId" });

  const source = accounts.find((a) => a.id === sourceAccountId);
  const target = accounts.find((a) => a.id === targetAccountId);

  const targetOptions = useMemo(
    () =>
      accounts.filter(
        (a) =>
          a.id !== sourceAccountId &&
          a.workspaceId !== source?.workspaceId &&
          (!source || a.currency === source.currency),
      ),
    [accounts, sourceAccountId, source],
  );

  const onSubmit = handleSubmit((values) => {
    const amountCents = parseAmountCents(values.amountUnits);
    if (amountCents === null) {
      toast.error("Monto inválido");
      return;
    }
    if (values.sourceAccountId === values.targetAccountId) {
      toast.error("Elegí cuentas distintas");
      return;
    }
    startTransition(async () => {
      const result = await createCrossWorkspaceContributionAction({
        sourceAccountId: values.sourceAccountId,
        targetAccountId: values.targetAccountId,
        amountCents,
        occurredOn: values.occurredOn,
        description: values.description.trim() || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Aporte registrado");
      router.refresh();
      onSuccess?.();
    });
  });

  if (accounts.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Necesitás cuentas en al menos dos espacios para aportar entre ellos.
      </p>
    );
  }

  const isBusy = isPending;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <FormStack>
        <FormField label="Sale de" htmlFor="contribute-source">
          <select
            id="contribute-source"
            className={nativeSelectClassName}
            {...register("sourceAccountId")}
            disabled={isBusy}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.workspaceName} · {a.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Entra en" htmlFor="contribute-target">
          <select
            id="contribute-target"
            className={nativeSelectClassName}
            {...register("targetAccountId")}
            disabled={isBusy}
          >
            {targetOptions.length === 0 ? (
              <option value="">No hay cuentas compatibles</option>
            ) : (
              targetOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.workspaceName} · {a.name}
                </option>
              ))
            )}
          </select>
        </FormField>

        <FormField
          label="Monto"
          htmlFor="contribute-amount"
          hint={`En ${source?.currency ?? currencyHint}`}
        >
          <Input
            id="contribute-amount"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            className="tabular-nums"
            {...register("amountUnits")}
            disabled={isBusy}
          />
        </FormField>

        <FormField label="Fecha" htmlFor="contribute-date">
          <Input
            id="contribute-date"
            type="date"
            {...register("occurredOn")}
            disabled={isBusy}
          />
        </FormField>

        <FormField label="Nota" htmlFor="contribute-note" optional>
          <Input
            id="contribute-note"
            placeholder="Aporte hogar · marzo"
            {...register("description")}
            disabled={isBusy}
          />
        </FormField>

        {source && target ? (
          <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-foreground">
            Sale de{" "}
            <strong>
              {source.workspaceName} · {source.name}
            </strong>
            {" → "}
            Entra en{" "}
            <strong>
              {target.workspaceName} · {target.name}
            </strong>
          </p>
        ) : null}
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
          disabled={isBusy || targetOptions.length === 0}
        >
          {isBusy ? "Registrando…" : "Aportar"}
        </Button>
      </FormActions>
    </form>
  );
}
