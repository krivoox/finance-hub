"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  deleteTransactionAction,
  updateTransactionAction,
} from "@/features/transactions/actions";
import type { TransactionType } from "@/features/transactions/domain";
import {
  FormActions,
  FormField,
  FormSection,
  FormStack,
} from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nativeSelectClassName } from "@/components/ui/native-select";

type AccountOption = { id: string; name: string; currency: string };
type CategoryOption = { id: string; name: string; kind: "income" | "expense" };

type EditTransactionFormProps = {
  transactionId: string;
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

function centsToUnits(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseAmountCents(raw: string): number | null {
  const parsedUnits = Number(raw.replace(",", "."));
  if (!Number.isFinite(parsedUnits) || parsedUnits <= 0) return null;
  const amountCents = Math.round(parsedUnits * 100);
  if (!Number.isInteger(amountCents) || amountCents <= 0) return null;
  return amountCents;
}

export function EditTransactionForm({
  transactionId,
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
  onSuccess,
  onCancel,
}: EditTransactionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const kindCategories = categories.filter((c) =>
    type === "income" ? c.kind === "income" : c.kind === "expense",
  );

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      amountUnits: centsToUnits(amountCents),
      occurredOn,
      description: description ?? "",
      categoryId: categoryId ?? "",
      accountId,
      counterpartyAccountId: counterpartyAccountId ?? "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    const parsed = parseAmountCents(values.amountUnits);
    if (parsed === null) {
      toast.error("Monto inválido");
      return;
    }
    startTransition(async () => {
      const result = await updateTransactionAction({
        transactionId,
        amountCents: parsed,
        occurredOn: values.occurredOn,
        description: values.description.trim() || null,
        accountId: values.accountId,
        ...(type === "transfer"
          ? { counterpartyAccountId: values.counterpartyAccountId }
          : { categoryId: values.categoryId }),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Movimiento actualizado");
      router.refresh();
      onSuccess?.();
    });
  });

  const onDelete = () => {
    startTransition(async () => {
      const result = await deleteTransactionAction({ transactionId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Movimiento eliminado");
      router.push("/transactions");
      router.refresh();
    });
  };

  const isBusy = isPending;
  const accountLabel =
    type === "income"
      ? "Se acredita en"
      : type === "expense"
        ? "Se descuenta de"
        : "Cuenta origen";

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
        <FormStack>
          <FormSection>
            <FormField
              label="Monto"
              htmlFor="edit-tx-amount"
              hint={`En ${currency}`}
            >
              <Input
                id="edit-tx-amount"
                type="text"
                inputMode="decimal"
                className="tabular-nums"
                disabled={isBusy}
                {...register("amountUnits")}
              />
            </FormField>

            <FormField label="Fecha" htmlFor="edit-tx-date">
              <Input
                id="edit-tx-date"
                type="date"
                disabled={isBusy}
                {...register("occurredOn")}
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
              <select
                id="edit-tx-account"
                className={nativeSelectClassName}
                disabled={isBusy}
                {...register("accountId")}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </FormField>

            {type === "transfer" ? (
              <FormField
                label="Cuenta destino"
                htmlFor="edit-tx-counterparty"
              >
                <select
                  id="edit-tx-counterparty"
                  className={nativeSelectClassName}
                  disabled={isBusy}
                  {...register("counterpartyAccountId")}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </FormField>
            ) : (
              <FormField label="Categoría" htmlFor="edit-tx-category">
                <select
                  id="edit-tx-category"
                  className={nativeSelectClassName}
                  disabled={isBusy}
                  {...register("categoryId")}
                >
                  {kindCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
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
            Eliminar movimiento
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="text-sm text-muted-foreground text-pretty">
              ¿Eliminar este movimiento? No se puede deshacer.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="h-10 w-full sm:h-8 sm:w-auto"
                disabled={isBusy}
                onClick={() => setConfirmDelete(false)}
              >
                Volver
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-10 w-full sm:h-8 sm:w-auto"
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
