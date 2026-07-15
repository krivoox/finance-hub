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

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">Monto ({currency})</span>
            <Input
              type="text"
              inputMode="decimal"
              {...register("amountUnits")}
              disabled={isPending}
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">Fecha</span>
            <Input type="date" {...register("occurredOn")} disabled={isPending} />
          </label>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Descripción</span>
          <Input {...register("description")} disabled={isPending} />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Cuenta</span>
          <select
            className={nativeSelectClassName}
            {...register("accountId")}
            disabled={isPending}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        {type === "transfer" ? (
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">Cuenta destino</span>
            <select
              className={nativeSelectClassName}
              {...register("counterpartyAccountId")}
              disabled={isPending}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">Categoría</span>
            <select
              className={nativeSelectClassName}
              {...register("categoryId")}
              disabled={isPending}
            >
              {kindCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </form>

      <div className="border-t border-border pt-4">
        {!confirmDelete ? (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setConfirmDelete(true)}
          >
            Eliminar movimiento
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">
              ¿Eliminar este movimiento? No se puede deshacer.
            </p>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={onDelete}
            >
              Confirmar eliminación
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => setConfirmDelete(false)}
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
