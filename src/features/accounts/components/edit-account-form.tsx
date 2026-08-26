"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateAccountAction } from "@/features/accounts/actions";
import { invalidateNewTransactionFormOptions } from "@/features/transactions/stores/new-transaction-form-options-store";
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
import { AmountInput } from "@/components/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatCentsAsAmountInput,
  parseAmountCents,
} from "@/domain/money/parse-amount";
import { refreshAfterMutation } from "@/lib/navigation";

type FormValues = {
  name: string;
  creditLimitUnits: string;
};

type EditAccountFormProps = {
  account: {
    id: string;
    name: string;
    type: AccountType;
    creditLimitCents: number | null;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function EditAccountForm({
  account,
  onSuccess,
  onCancel,
}: EditAccountFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isCreditCard = account.type === "credit_card";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: account.name,
      creditLimitUnits:
        account.creditLimitCents != null
          ? formatCentsAsAmountInput(account.creditLimitCents)
          : "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    const trimmedName = values.name.trim();
    if (!trimmedName) {
      toast.error("Nombre requerido");
      return;
    }

    const input: UpdateAccountInput = {
      accountId: account.id,
      name: trimmedName,
    };

    if (isCreditCard) {
      const raw = values.creditLimitUnits.trim();
      if (raw === "") {
        input.creditLimitCents = null;
      } else {
        const parsedCents = parseAmountCents(raw);
        if (parsedCents === null) {
          toast.error("Límite de crédito inválido");
          return;
        }
        input.creditLimitCents = parsedCents;
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
      invalidateNewTransactionFormOptions();
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

        {isCreditCard ? (
          <FormField
            label="Límite de crédito"
            htmlFor="edit-account-credit-limit"
            optional
            hint="Opcional. Dejá vacío para quitar el límite."
          >
            <AmountInput
              id="edit-account-credit-limit"
              placeholder="Sin límite"
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
          {isBusy ? "Guardando..." : "Guardar"}
        </Button>
      </FormActions>
    </form>
  );
}
