"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateAccountAction } from "@/features/accounts/actions";
import {
  updateAccountSchema,
  type UpdateAccountInput,
} from "@/features/accounts/schemas";
import type { AccountType } from "@/features/accounts/domain";
import {
  FormActions,
  FormField,
  FormStack,
} from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { refreshAfterMutation } from "@/lib/navigation";
import { ACCOUNT_TYPE_LABEL_ES } from "./account-type-labels";

type FormValues = {
  name: string;
  creditLimitUnits: string;
};

type EditAccountFormProps = {
  accountId: string;
  name: string;
  type: AccountType;
  currency: string;
  creditLimitCents: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
};

function centsToUnits(cents: number): string {
  return (cents / 100).toFixed(2);
}

function currencyLabel(currency: string): string {
  if (currency === "USD") return "dólares (USD)";
  if (currency === "ARS") return "pesos (ARS)";
  return currency;
}

export function EditAccountForm({
  accountId,
  name,
  type,
  currency,
  creditLimitCents,
  onSuccess,
  onCancel,
}: EditAccountFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isCreditCard = type === "credit_card";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name,
      creditLimitUnits:
        creditLimitCents != null ? centsToUnits(creditLimitCents) : "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    const trimmedName = values.name.trim();
    if (!trimmedName) {
      toast.error("Nombre requerido");
      return;
    }

    const input: UpdateAccountInput = {
      accountId,
      name: trimmedName,
    };

    if (isCreditCard) {
      const raw = values.creditLimitUnits.trim();
      if (raw === "") {
        input.creditLimitCents = null;
      } else {
        const parsedLimit = Number(raw.replace(",", "."));
        if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
          toast.error("Límite de crédito inválido");
          return;
        }
        const nextLimitCents = Math.round(parsedLimit * 100);
        if (nextLimitCents <= 0) {
          toast.error("Límite de crédito inválido");
          return;
        }
        input.creditLimitCents = nextLimitCents;
      }
    }

    const clientCheck = updateAccountSchema.safeParse(input);
    if (!clientCheck.success) {
      toast.error(clientCheck.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    startTransition(async () => {
      const result = await updateAccountAction(clientCheck.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cuenta actualizada");
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
          htmlFor="edit-account-name"
          error={errors.name?.message}
        >
          <Input
            id="edit-account-name"
            aria-invalid={Boolean(errors.name)}
            {...register("name", { required: "Nombre requerido" })}
          />
        </FormField>

        <FormField label="Tipo" htmlFor="edit-account-type">
          <Input
            id="edit-account-type"
            value={ACCOUNT_TYPE_LABEL_ES[type]}
            readOnly
            disabled
            className="bg-muted"
          />
        </FormField>

        <FormField
          label="Moneda"
          htmlFor="edit-account-currency"
          hint="La moneda no se puede cambiar después de crear la cuenta."
        >
          <Input
            id="edit-account-currency"
            value={currency}
            readOnly
            disabled
            className="bg-muted"
          />
        </FormField>

        {isCreditCard ? (
          <FormField
            label="Límite de crédito"
            htmlFor="edit-account-credit-limit"
            optional
            hint={`Opcional. En ${currencyLabel(currency)}. Dejá vacío para quitar el límite.`}
          >
            <Input
              id="edit-account-credit-limit"
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
          {isBusy ? "Guardando..." : "Guardar"}
        </Button>
      </FormActions>
    </form>
  );
}
