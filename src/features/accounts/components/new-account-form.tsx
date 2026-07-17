"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { nativeSelectClassName } from "@/components/ui/native-select";
import { ACCOUNT_TYPE_LABEL_ES } from "./account-type-labels";

type FormValues = {
  name: string;
  type: AccountType;
  currency: "ARS" | "USD";
  initialBalanceUnits: string;
};

type NewAccountFormProps = {
  workspaceId: string;
  workspaceCurrency: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

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
    reset,
    watch,
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
    },
  });

  const selectedCurrency = watch("currency");

  const onSubmit = handleSubmit((values) => {
    const parsedUnits = Number(values.initialBalanceUnits.replace(",", "."));
    if (!Number.isFinite(parsedUnits) || parsedUnits < 0) {
      toast.error("Saldo inicial inválido");
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
          htmlFor="account-name"
          error={errors.name?.message}
        >
          <Input
            id="account-name"
            placeholder="Caja de ahorro, Mercado Pago…"
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
          label="Saldo inicial"
          htmlFor="account-initial-balance"
          hint={`En ${selectedCurrency === "USD" ? "dólares (USD)" : "pesos (ARS)"}`}
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
          {isBusy ? "Creando..." : "Crear cuenta"}
        </Button>
      </FormActions>
    </form>
  );
}
