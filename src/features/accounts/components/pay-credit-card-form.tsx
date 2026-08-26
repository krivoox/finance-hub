"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  FormActions,
  FormField,
  FormStack,
} from "@/components/form-sheet";
import { AmountInput } from "@/components/amount-input";
import { DateField } from "@/components/date-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatCentsAsAmountInput,
  parseAmountCents,
} from "@/domain/money/parse-amount";
import { FormSelect } from "@/components/ui/select";
import { createTransferAction } from "@/features/transactions/actions";
import { formatMoney } from "@/lib/format-money";
import { refreshAfterMutation } from "@/lib/navigation";

export type PayCreditCardAccountOption = {
  id: string;
  name: string;
  currency: string;
  type: string;
};

type FormValues = {
  fromAccountId: string;
  amountUnits: string;
  occurredOn: string;
  description: string;
};

type PayCreditCardFormProps = {
  workspaceId: string;
  creditCard: {
    id: string;
    name: string;
    currency: string;
    debtCents: number;
  };
  sourceAccounts: readonly PayCreditCardAccountOption[];
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

export function PayCreditCardForm({
  workspaceId,
  creditCard,
  sourceAccounts,
  onSuccess,
  onCancel,
}: PayCreditCardFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const eligibleSources = useMemo(
    () =>
      sourceAccounts.filter(
        (a) =>
          a.id !== creditCard.id &&
          a.currency === creditCard.currency &&
          a.type !== "credit_card",
      ),
    [sourceAccounts, creditCard.id, creditCard.currency],
  );

  const defaultFromId =
    eligibleSources.length === 1 ? eligibleSources[0]!.id : "";

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      fromAccountId: defaultFromId,
      amountUnits: formatCentsAsAmountInput(creditCard.debtCents),
      occurredOn: todayIsoDate(),
      description: "Pago de resumen",
    },
  });

  const watchedFrom = useWatch({ control, name: "fromAccountId" });
  const isBusy = isPending || isSubmitting;

  const onSubmit = handleSubmit((values) => {
    if (eligibleSources.length === 0) {
      toast.error(
        `No hay otra cuenta en ${creditCard.currency} para pagar. Creá o usá una cuenta en la misma moneda.`,
      );
      return;
    }

    const amountCents = parseAmountCents(values.amountUnits);
    if (amountCents == null) {
      toast.error("Monto inválido");
      return;
    }

    if (!values.fromAccountId) {
      toast.error("Elegí desde qué cuenta pagás");
      return;
    }

    startTransition(async () => {
      const result = await createTransferAction({
        workspaceId,
        accountId: values.fromAccountId,
        counterpartyAccountId: creditCard.id,
        amountCents,
        occurredOn: values.occurredOn,
        description: values.description.trim() || null,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Pago registrado");
      refreshAfterMutation(router);
      onSuccess?.();
    });
  });

  if (eligibleSources.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-pretty text-muted-foreground">
          No hay otra cuenta en {creditCard.currency} para pagar. Creá o usá
          una cuenta en la misma moneda.
        </p>
        <FormActions>
          <Button
            type="button"
            variant="outline"
            
            onClick={onCancel}
          >
            Cerrar
          </Button>
        </FormActions>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <FormStack>
        <FormField
          label="Se paga desde"
          htmlFor="pay-card-from"
          error={
            !watchedFrom && errors.fromAccountId
              ? "Elegí una cuenta"
              : undefined
          }
        >
          <FormSelect
            control={control}
            name="fromAccountId"
            id="pay-card-from"
            rules={{ required: true }}
            disabled={isBusy}
            invalid={Boolean(errors.fromAccountId)}
            placeholder="Elegí una cuenta…"
            options={[
              { value: "", label: "Elegí una cuenta…" },
              ...eligibleSources.map((a) => ({
                value: a.id,
                label: a.name,
              })),
            ]}
          />
        </FormField>

        <FormField label="Tarjeta" htmlFor="pay-card-to">
          <Input
            id="pay-card-to"
            value={creditCard.name}
            readOnly
            disabled
            className="h-11 sm:h-9"
          />
        </FormField>

        <FormField
          label="Monto"
          htmlFor="pay-card-amount"
          hint={`Deuda actual: ${formatMoney(creditCard.debtCents, creditCard.currency)}`}
        >
          <AmountInput
            id="pay-card-amount"
            className="h-11 text-base sm:h-9 sm:text-sm"
            disabled={isBusy}
            {...register("amountUnits", { required: true })}
          />
        </FormField>

        <FormField label="Fecha" htmlFor="pay-card-date">
          <Controller
            control={control}
            name="occurredOn"
            rules={{ required: true }}
            render={({ field }) => (
              <DateField
                id="pay-card-date"
                name={field.name}
                triggerClassName="h-11 sm:h-9"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={isBusy}
                invalid={Boolean(errors.occurredOn)}
              />
            )}
          />
        </FormField>

        <FormField label="Descripción" htmlFor="pay-card-desc" optional>
          <Input
            id="pay-card-desc"
            placeholder="Pago de resumen"
            className="h-11 sm:h-9"
            disabled={isBusy}
            {...register("description")}
          />
        </FormField>
      </FormStack>

      <FormActions>
        <Button
          type="button"
          variant="outline"
          
          disabled={isBusy}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit"  disabled={isBusy}>
          {isBusy ? "Registrando…" : "Registrar pago"}
        </Button>
      </FormActions>
    </form>
  );
}
