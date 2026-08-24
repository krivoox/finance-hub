"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { createAccountAction } from "@/features/accounts/actions";
import {
  createAccountSchema,
  type CreateAccountInput,
} from "@/features/accounts/schemas";
import { ACCOUNT_TYPES, type AccountType } from "@/features/accounts/domain";
import {
  FormActions,
  FormField,
  FormStack,
} from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { refreshAfterMutation } from "@/lib/navigation";
import { Input } from "@/components/ui/input";
import { nativeSelectClassName } from "@/components/ui/native-select";
import { ACCOUNT_TYPE_LABEL_ES } from "./account-type-labels";

type FormValues = {
  name: string;
  type: AccountType;
  currency: "ARS" | "USD";
  initialBalanceUnits: string;
  creditLimitUnits: string;
};

type NewAccountFormProps = {
  workspaceId: string;
  workspaceCurrency: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

function currencyLabel(currency: "ARS" | "USD"): string {
  return currency === "USD" ? "dólares (USD)" : "pesos (ARS)";
}

export function NewAccountForm({
  workspaceId,
  workspaceCurrency,
  onSuccess,
  onCancel,
}: NewAccountFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      type: "checking",
      currency:
        workspaceCurrency === "USD" || workspaceCurrency === "ARS"
          ? workspaceCurrency
          : "ARS",
      initialBalanceUnits: "0",
      creditLimitUnits: "",
    },
  });

  const selectedType = useWatch({ control, name: "type" });
  const selectedCurrency = useWatch({ control, name: "currency" });
  const isCreditCard = selectedType === "credit_card";

  const onSubmit = handleSubmit((values) => {
    const submittingCreditCard = values.type === "credit_card";
    const parsedUnits = Number(values.initialBalanceUnits.replace(",", "."));
    if (!Number.isFinite(parsedUnits) || parsedUnits < 0) {
      toast.error(
        submittingCreditCard
          ? "Deuda inicial inválida"
          : "Saldo inicial inválido",
      );
      return;
    }

    const initialBalanceCents = Math.round(parsedUnits * 100);

    const input: CreateAccountInput = {
      workspaceId,
      name: values.name,
      type: values.type,
      initialBalanceCents,
      currency: values.currency,
    };

    if (values.type === "credit_card" && values.creditLimitUnits.trim() !== "") {
      const parsedLimit = Number(values.creditLimitUnits.replace(",", "."));
      if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
        toast.error("Límite de crédito inválido");
        return;
      }
      const creditLimitCents = Math.round(parsedLimit * 100);
      if (creditLimitCents <= 0) {
        toast.error("Límite de crédito inválido");
        return;
      }
      input.creditLimitCents = creditLimitCents;
    }

    const clientCheck = createAccountSchema.safeParse(input);
    if (!clientCheck.success) {
      toast.error(clientCheck.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    startTransition(async () => {
      const result = await createAccountAction(clientCheck.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cuenta creada");
      reset({
        name: "",
        type: "checking",
        currency:
          workspaceCurrency === "USD" || workspaceCurrency === "ARS"
            ? workspaceCurrency
            : "ARS",
        initialBalanceUnits: "0",
        creditLimitUnits: "",
      });
      onSuccess?.();
      refreshAfterMutation(router);
    });
  });

  const isBusy = isPending || isSubmitting;

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FormStack>
        <FormField
          label="Nombre"
          htmlFor="account-name"
          error={errors.name?.message}
          hint={
            isCreditCard
              ? "Si gasta en ARS y USD, creá una cuenta por moneda (ej. Visa ARS / Visa USD)."
              : undefined
          }
        >
          <Input
            id="account-name"
            placeholder={
              isCreditCard
                ? "Visa Quiero ARS, Mastercard USD…"
                : "Caja de ahorro, Mercado Pago…"
            }
            aria-invalid={Boolean(errors.name)}
            {...register("name", { required: "Nombre requerido" })}
          />
        </FormField>

        <FormField label="Tipo" htmlFor="account-type">
          <select
            id="account-type"
            className={nativeSelectClassName}
            {...register("type")}
          >
            {ACCOUNT_TYPES.map((code) => (
              <option key={code} value={code}>
                {ACCOUNT_TYPE_LABEL_ES[code]}
              </option>
            ))}
          </select>
        </FormField>

        {isCreditCard ? (
          <p
            className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground text-pretty"
            role="note"
          >
            Una tarjeta que gasta en pesos y dólares son dos cuentas: una en ARS
            y otra en USD. Así la deuda y los pagos no se mezclan.
          </p>
        ) : null}

        <FormField label="Moneda" htmlFor="account-currency">
          <select
            id="account-currency"
            className={nativeSelectClassName}
            {...register("currency")}
          >
            <option value="ARS">Pesos (ARS)</option>
            <option value="USD">Dólares (USD)</option>
          </select>
        </FormField>

        <FormField
          label={isCreditCard ? "Deuda inicial" : "Saldo inicial"}
          htmlFor="account-initial-balance"
          hint={
            isCreditCard
              ? `Monto adeudado en ${currencyLabel(selectedCurrency ?? "ARS")}`
              : `En ${currencyLabel(selectedCurrency ?? "ARS")}`
          }
        >
          <Input
            id="account-initial-balance"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            className="tabular-nums"
            {...register("initialBalanceUnits", { required: true })}
          />
        </FormField>

        {isCreditCard ? (
          <FormField
            label="Límite de crédito"
            htmlFor="account-credit-limit"
            optional
            hint={`Opcional. En ${currencyLabel(selectedCurrency ?? "ARS")}, misma moneda que la cuenta.`}
          >
            <Input
              id="account-credit-limit"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="Sin límite"
              className="tabular-nums"
              {...register("creditLimitUnits")}
            />
          </FormField>
        ) : null}
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
          {isBusy ? "Creando..." : "Crear cuenta"}
        </Button>
      </FormActions>
    </form>
  );
}
