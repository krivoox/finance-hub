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
import type { AccountType } from "@/features/accounts/domain";
import { createBalanceAdjustmentAction } from "@/features/transactions/actions";
import { invalidateNewTransactionFormOptions } from "@/features/transactions/stores/new-transaction-form-options-store";
import { useTransactionFeedbackStore } from "@/features/transactions/stores/transaction-feedback-store";
import { refreshAfterMutation } from "@/lib/navigation";

import {
  adjustmentTargetLabel,
  buildAdjustmentPreview,
  formatAdjustmentCurrent,
  isCreditCardAccount,
} from "./adjustment-preview";

type FormValues = {
  amountUnits: string;
  occurredOn: string;
  description: string;
};

export type AdjustBalanceAccount = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balanceCents: number;
};

type AdjustBalanceFormProps = {
  workspaceId: string;
  account: AdjustBalanceAccount;
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

export function AdjustBalanceForm({
  workspaceId,
  account,
  onSuccess,
  onCancel,
}: AdjustBalanceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const showFeedback = useTransactionFeedbackStore((s) => s.showFeedback);
  const isCard = isCreditCardAccount(account.type);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      amountUnits: formatCentsAsAmountInput(account.balanceCents),
      occurredOn: todayIsoDate(),
      description: "",
    },
  });

  const watchedAmount = useWatch({ control, name: "amountUnits" });
  const targetCents = parseAmountCents(watchedAmount ?? "", {
    allowZero: true,
    allowNegative: !isCard,
  });
  const preview = useMemo(
    () =>
      buildAdjustmentPreview({
        accountType: account.type,
        currentBalanceCents: account.balanceCents,
        targetBalanceCents: targetCents,
        currency: account.currency,
      }),
    [account.balanceCents, account.currency, account.type, targetCents],
  );

  const isBusy = isPending || isSubmitting;

  const onSubmit = handleSubmit((values) => {
    const parsedTarget = parseAmountCents(values.amountUnits, {
      allowZero: true,
      allowNegative: !isCard,
    });
    if (parsedTarget === null) {
      toast.error("Saldo inválido");
      return;
    }

    startTransition(async () => {
      const result = await createBalanceAdjustmentAction({
        workspaceId,
        accountId: account.id,
        targetBalanceCents: parsedTarget,
        occurredOn: values.occurredOn,
        description: values.description.trim() || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      showFeedback({
        amountCents: result.data.signedEffect,
        currency: account.currency,
        kind: "adjustment",
      });
      invalidateNewTransactionFormOptions(workspaceId);
      onSuccess?.();
      refreshAfterMutation(router);
    });
  });

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FormStack>
        <FormField
          label={adjustmentTargetLabel(account.type)}
          htmlFor="adjust-target"
          hint={
            isCard
              ? `Deuda hoy: ${formatAdjustmentCurrent(account.type, account.balanceCents, account.currency)}. El del resumen.`
              : `Hoy: ${formatAdjustmentCurrent(account.type, account.balanceCents, account.currency)}. El del banco o billetera.`
          }
        >
          <AmountInput
            id="adjust-target"
            allowNegative={!isCard}
            aria-invalid={Boolean(errors.amountUnits)}
            {...register("amountUnits", { required: true })}
          />
        </FormField>

        {preview.text ? (
          <p
            className={
              preview.kind === "ready"
                ? "rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-foreground"
                : "rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground"
            }
          >
            {preview.text}
          </p>
        ) : null}

        {isCard ? (
          <p className="text-sm text-muted-foreground text-pretty">
            Si pagaste el resumen desde otra cuenta, usá{" "}
            <span className="font-medium text-foreground">Pagar</span>. El
            ajuste no mueve dinero de otro lado.
          </p>
        ) : null}

        <FormField label="Fecha" htmlFor="adjust-date">
          <Controller
            control={control}
            name="occurredOn"
            rules={{ required: true }}
            render={({ field }) => (
              <DateField
                id="adjust-date"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={isBusy}
                invalid={Boolean(errors.occurredOn)}
              />
            )}
          />
        </FormField>

        <FormField label="Nota" htmlFor="adjust-description" optional>
          <Input
            id="adjust-description"
            placeholder="Extracto, redondeo…"
            {...register("description")}
          />
        </FormField>
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
          disabled={isBusy || preview.kind !== "ready"}
        >
          {isBusy ? "Guardando..." : "Ajustar"}
        </Button>
      </FormActions>
    </form>
  );
}
