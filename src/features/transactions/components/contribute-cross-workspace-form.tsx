"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { createCrossWorkspaceContributionAction } from "@/features/transactions/actions";
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
    });
  });

  if (accounts.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Necesitás cuentas en al menos dos espacios para aportar entre ellos.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Sale de</span>
          <select
            className={nativeSelectClassName}
            {...register("sourceAccountId")}
            disabled={isPending}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.workspaceName} · {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Entra en</span>
          <select
            className={nativeSelectClassName}
            {...register("targetAccountId")}
            disabled={isPending}
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
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7.5rem]">
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">
            Monto ({source?.currency ?? currencyHint})
          </span>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            {...register("amountUnits")}
            disabled={isPending}
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Fecha</span>
          <Input type="date" {...register("occurredOn")} disabled={isPending} />
        </label>
      </div>

      <label className="block space-y-1.5 text-sm">
        <span className="text-muted-foreground">Nota (opcional)</span>
        <Input
          placeholder="Aporte hogar · marzo"
          {...register("description")}
          disabled={isPending}
        />
      </label>

      {source && target ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
          Sale de <strong>{source.workspaceName} · {source.name}</strong>
          {" → "}
          Entra en <strong>{target.workspaceName} · {target.name}</strong>
        </p>
      ) : null}

      <Button type="submit" disabled={isPending || targetOptions.length === 0}>
        {isPending ? "Registrando…" : "Aportar"}
      </Button>
    </form>
  );
}
