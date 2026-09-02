"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  deleteTransactionAction,
  updateTransactionAction,
} from "@/features/transactions/actions";
import {
  isAdjustmentType,
  type TransactionType,
} from "@/features/transactions/domain";
import { CategorySelectField } from "@/features/categories/components/category-select-field";
import {
  FormActions,
  FormField,
  FormSection,
  FormStack,
} from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import {
  navigateAndRefresh,
  refreshAfterMutation,
} from "@/lib/navigation";
import { AmountInput } from "@/components/amount-input";
import { DateField } from "@/components/date-field";
import { Input } from "@/components/ui/input";
import {
  formatCentsAsAmountInput,
  parseAmountCents,
} from "@/domain/money/parse-amount";
import { FormSelect } from "@/components/ui/select";

type AccountOption = { id: string; name: string; currency: string };
type CategoryOption = { id: string; name: string; kind: "income" | "expense" };

type EditTransactionFormProps = {
  transactionId: string;
  workspaceId: string;
  type: TransactionType;
  amountCents: number;
  currency: string;
  occurredOn: string;
  description: string | null;
  categoryId: string | null;
  accountId: string;
  counterpartyAccountId: string | null;
  accounts: readonly AccountOption[];
  categories: readonly CategoryOption[];
  /** SPEC-08 H4 — amount/accounts locked when transfer is a goal contribution. */
  linkedToGoal?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
};

type FormValues = {
  amountUnits: string;
  occurredOn: string;
  description: string;
  categoryId: string;
  accountId: string;
  counterpartyAccountId: string;
};

export function EditTransactionForm({
  transactionId,
  workspaceId,
  type,
  amountCents,
  currency,
  occurredOn,
  description,
  categoryId,
  accountId,
  counterpartyAccountId,
  accounts,
  categories,
  linkedToGoal = false,
  onSuccess,
  onCancel,
}: EditTransactionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const kindCategories = categories.filter((c) =>
    type === "income" ? c.kind === "income" : c.kind === "expense",
  );

  const { register, handleSubmit, control } = useForm<FormValues>({
    defaultValues: {
      amountUnits: formatCentsAsAmountInput(amountCents),
      occurredOn,
      description: description ?? "",
      categoryId: categoryId ?? "",
      accountId,
      counterpartyAccountId: counterpartyAccountId ?? "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    if (!ledgerLocked) {
      const parsed = parseAmountCents(values.amountUnits);
      if (parsed === null) {
        toast.error("Monto inválido");
        return;
      }
    }
    startTransition(async () => {
      const result = await updateTransactionAction({
        transactionId,
        occurredOn: values.occurredOn,
        description: values.description.trim() || null,
        ...(ledgerLocked
          ? {}
          : {
              amountCents: parseAmountCents(values.amountUnits)!,
              accountId: values.accountId,
              ...(type === "transfer"
                ? { counterpartyAccountId: values.counterpartyAccountId }
                : { categoryId: values.categoryId }),
            }),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Transacción actualizada");
      onSuccess?.();
      refreshAfterMutation(router);
    });
  });

  const onDelete = () => {
    startTransition(async () => {
      const result = await deleteTransactionAction({ transactionId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Transacción eliminada");
      navigateAndRefresh(router, "/transactions");
    });
  };

  const isBusy = isPending;
  const isAdjustment = isAdjustmentType(type);
  const ledgerLocked = linkedToGoal || isAdjustment;
  const accountLabel =
    type === "income"
      ? "Se acredita en"
      : type === "expense"
        ? "Se descuenta de"
        : isAdjustment
          ? "Cuenta"
          : "Cuenta origen";

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
        <FormStack>
          {linkedToGoal ? (
            <p className="text-sm text-muted-foreground">
              Este movimiento es un aporte a un objetivo: podés editar fecha y
              descripción. Para cambiar el monto, eliminá el movimiento (deshace
              el aporte).
            </p>
          ) : null}
          {isAdjustment ? (
            <p className="text-sm text-muted-foreground">
              Este es un ajuste de saldo: podés cambiar fecha y nota. Para otro
              valor, usá Ajustar en Cuentas o eliminá este movimiento y creá uno
              nuevo.
            </p>
          ) : null}
          <FormSection>
            <FormField
              label="Monto"
              htmlFor="edit-tx-amount"
              hint={`En ${currency}`}
            >
              <AmountInput
                id="edit-tx-amount"
                disabled={isBusy || ledgerLocked}
                {...register("amountUnits")}
              />
            </FormField>

            <FormField label="Fecha" htmlFor="edit-tx-date">
              <Controller
                control={control}
                name="occurredOn"
                render={({ field }) => (
                  <DateField
                    id="edit-tx-date"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isBusy}
                  />
                )}
              />
            </FormField>

            <FormField
              label="Descripción"
              htmlFor="edit-tx-description"
              optional
            >
              <Input
                id="edit-tx-description"
                disabled={isBusy}
                {...register("description")}
              />
            </FormField>
          </FormSection>

          <FormSection title="Cuenta y categoría">
            <FormField label={accountLabel} htmlFor="edit-tx-account">
              <FormSelect
                control={control}
                name="accountId"
                id="edit-tx-account"
                disabled={isBusy || ledgerLocked}
                options={accounts.map((a) => ({
                  value: a.id,
                  label: a.name,
                }))}
              />
            </FormField>

            {type === "transfer" ? (
              <FormField
                label="Cuenta destino"
                htmlFor="edit-tx-counterparty"
              >
                <FormSelect
                  control={control}
                  name="counterpartyAccountId"
                  id="edit-tx-counterparty"
                  disabled={isBusy || ledgerLocked}
                  options={accounts.map((a) => ({
                    value: a.id,
                    label: a.name,
                  }))}
                />
              </FormField>
            ) : isAdjustment ? null : (
              <FormField label="Categoría" htmlFor="edit-tx-category">
                <Controller
                  control={control}
                  name="categoryId"
                  rules={{ required: true }}
                  render={({ field }) => (
                    <CategorySelectField
                      id="edit-tx-category"
                      kind={type === "income" ? "income" : "expense"}
                      workspaceId={workspaceId}
                      categories={kindCategories}
                      value={field.value || null}
                      onChange={(id) => field.onChange(id ?? "")}
                      disabled={isBusy}
                      placeholder="Elegir categoría"
                    />
                  )}
                />
              </FormField>
            )}
          </FormSection>
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
            {isBusy ? "Guardando…" : "Guardar cambios"}
          </Button>
        </FormActions>
      </form>

      <section className="space-y-3 border-t border-border pt-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Zona de peligro
        </p>
        {!confirmDelete ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-8 sm:w-auto"
            disabled={isBusy}
            onClick={() => setConfirmDelete(true)}
          >
            Eliminar transacción
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="text-sm text-muted-foreground text-pretty">
              {linkedToGoal
                ? "¿Eliminar este aporte? Se deshace el progreso del objetivo y no se puede deshacer."
                : isAdjustment
                  ? "¿Eliminar este ajuste? El saldo de la cuenta vuelve al valor anterior."
                  : "¿Eliminar esta transacción? No se puede deshacer."}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto"
                disabled={isBusy}
                onClick={() => setConfirmDelete(false)}
              >
                Volver
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto"
                disabled={isBusy}
                onClick={onDelete}
              >
                Confirmar eliminación
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
