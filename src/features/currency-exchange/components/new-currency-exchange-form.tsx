"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { createCurrencyExchangeAction } from "@/features/currency-exchange/actions";
import { formatImpliedRateCaption } from "@/features/currency-exchange/domain";
import type { AccountCurrency } from "@/domain/money/currencies";
import {
  FormActions,
  FormField,
  FormSection,
  FormStack,
} from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nativeSelectClassName } from "@/components/ui/native-select";

type AccountOption = {
  id: string;
  name: string;
  currency: string;
};

type FormValues = {
  fromAccountId: string;
  toAccountId: string;
  fromAmountUnits: string;
  toAmountUnits: string;
  occurredOn: string;
  description: string;
};

type NewCurrencyExchangeFormProps = {
  workspaceId: string;
  accounts: readonly AccountOption[];
  onSuccess?: () => void;
  onCancel?: () => void;
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

const SELECT_CLASSES = nativeSelectClassName;

export function NewCurrencyExchangeForm({
  workspaceId,
  accounts,
  onSuccess,
  onCancel,
}: NewCurrencyExchangeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const defaultFrom =
    accounts.find((a) => a.currency === "ARS")?.id ?? accounts[0]?.id ?? "";
  const defaultTo =
    accounts.find((a) => a.currency === "USD" && a.id !== defaultFrom)?.id ??
    accounts.find((a) => a.id !== defaultFrom)?.id ??
    "";

  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      fromAccountId: defaultFrom,
      toAccountId: defaultTo,
      fromAmountUnits: "",
      toAmountUnits: "",
      occurredOn: todayIsoDate(),
      description: "",
    },
  });

  const fromAccountId = useWatch({ control, name: "fromAccountId" });
  const toAccountId = useWatch({ control, name: "toAccountId" });
  const fromAmountUnits = useWatch({ control, name: "fromAmountUnits" });
  const toAmountUnits = useWatch({ control, name: "toAmountUnits" });

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);

  const impliedCaption = useMemo(() => {
    const fromCents = parseAmountCents(fromAmountUnits ?? "");
    const toCents = parseAmountCents(toAmountUnits ?? "");
    if (
      !fromCents ||
      !toCents ||
      !fromAccount ||
      !toAccount ||
      fromAccount.currency === toAccount.currency
    ) {
      return null;
    }
    return formatImpliedRateCaption(
      fromAccount.currency as AccountCurrency,
      toAccount.currency as AccountCurrency,
      fromCents,
      toCents,
    );
  }, [fromAmountUnits, toAmountUnits, fromAccount, toAccount]);

  const toOptions = accounts.filter((a) => a.id !== fromAccountId);
  const fromOptions = accounts.filter((a) => a.id !== toAccountId);

  const onSubmit = handleSubmit((values) => {
    const fromAmountCents = parseAmountCents(values.fromAmountUnits);
    const toAmountCents = parseAmountCents(values.toAmountUnits);
    if (!fromAmountCents || !toAmountCents) {
      toast.error("Indicá montos válidos de origen y destino");
      return;
    }

    startTransition(async () => {
      const result = await createCurrencyExchangeAction({
        workspaceId,
        fromAccountId: values.fromAccountId,
        toAccountId: values.toAccountId,
        fromAmountCents,
        toAmountCents,
        occurredOn: values.occurredOn,
        description: values.description.trim() || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cambio de moneda registrado");
      router.refresh();
      onSuccess?.();
    });
  });

  const isBusy = isPending || isSubmitting;
  const canExchange = accounts.length >= 2;

  if (!canExchange) {
    return (
      <p className="text-sm text-muted-foreground">
        Necesitás al menos dos cuentas (p. ej. ARS y USD) para registrar un
        canje.
      </p>
    );
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FormStack>
        <FormSection>
          <FormField label="De cuenta" htmlFor="fx-from-account">
            <select
              id="fx-from-account"
              className={SELECT_CLASSES}
              {...register("fromAccountId", { required: true })}
            >
              {fromOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Monto origen"
            htmlFor="fx-from-amount"
            hint={fromAccount ? `En ${fromAccount.currency}` : undefined}
          >
            <Input
              id="fx-from-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="0,00"
              className="tabular-nums"
              {...register("fromAmountUnits", { required: true })}
            />
          </FormField>
        </FormSection>

        <FormSection>
          <FormField label="A cuenta" htmlFor="fx-to-account">
            <select
              id="fx-to-account"
              className={SELECT_CLASSES}
              {...register("toAccountId", { required: true })}
            >
              {toOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Monto destino"
            htmlFor="fx-to-amount"
            hint={toAccount ? `En ${toAccount.currency}` : undefined}
          >
            <Input
              id="fx-to-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="0,00"
              className="tabular-nums"
              {...register("toAmountUnits", { required: true })}
            />
          </FormField>
        </FormSection>

        {impliedCaption ? (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
            TC implícito:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {impliedCaption}
            </span>
          </p>
        ) : null}

        <FormSection>
          <FormField label="Fecha" htmlFor="fx-occurred-on">
            <Input
              id="fx-occurred-on"
              type="date"
              {...register("occurredOn", { required: true })}
            />
          </FormField>

          <FormField label="Descripción" htmlFor="fx-description" optional>
            <Input
              id="fx-description"
              placeholder="Compra dólares, venta MEP…"
              {...register("description")}
            />
          </FormField>
        </FormSection>
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
          {isBusy ? "Guardando..." : "Registrar canje"}
        </Button>
      </FormActions>
    </form>
  );
}
