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
          ? (account.creditLimitCents / 100).toFixed(2)
          : "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    const input: UpdateAccountInput = {
      accountId: account.id,
      name: values.name,
    };

    if (isCreditCard) {
      const raw = values.creditLimitUnits.trim();
      if (raw === "") {
        input.creditLimitCents = null;
      } else {
        const parsedUnits = Number(raw.replace(",", "."));
        if (!Number.isFinite(parsedUnits) || parsedUnits <= 0) {
          toast.error("Límite de crédito inválido");
          return;
        }
        input.creditLimitCents = Math.round(parsedUnits * 100);
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

        {isCreditCard ? (
          <FormField
            label="Límite de crédito"
            htmlFor="edit-account-credit-limit"
            hint="Opcional. Dejá vacío para quitar el límite."
          >
            <Input
              id="edit-account-credit-limit"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="Opcional"
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
