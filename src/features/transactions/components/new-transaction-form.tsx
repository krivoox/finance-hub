"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  createExpenseAction,
  createIncomeAction,
  createTransferAction,
} from "@/features/transactions/actions";
import {
  TRANSACTION_TYPES,
  type TransactionType,
} from "@/features/transactions/domain";
import { TRANSACTION_TYPE_LABEL_ES } from "./transaction-type-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AccountOption = {
  id: string;
  name: string;
  currency: string;
};

type CategoryOption = {
  id: string;
  name: string;
  kind: "income" | "expense";
};

type NewTransactionFormProps = {
  workspaceId: string;
  workspaceCurrency: string;
  accounts: readonly AccountOption[];
  categories: readonly CategoryOption[];
};

type FormValues = {
  type: TransactionType;
  amountUnits: string;
  occurredOn: string;
  accountId: string;
  counterpartyAccountId: string;
  categoryId: string;
  description: string;
};

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const SELECT_CLASSES =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function NewTransactionForm({
  workspaceId,
  workspaceCurrency,
  accounts,
  categories,
}: NewTransactionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const defaultAccountId = accounts[0]?.id ?? "";
  const defaultCounterpartyId = accounts[1]?.id ?? "";
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      type: "expense",
      amountUnits: "",
      occurredOn: todayIsoDate(),
      accountId: defaultAccountId,
      counterpartyAccountId: defaultCounterpartyId,
      categoryId: "",
      description: "",
    },
  });

  const watchedType = useWatch({ control, name: "type" });
  const watchedAccountId = useWatch({ control, name: "accountId" });

  const filteredCategories = useMemo(
    () =>
      watchedType === "transfer"
        ? []
        : categories.filter((c) => c.kind === watchedType),
    [categories, watchedType],
  );

  const counterpartyOptions = useMemo(
    () => accounts.filter((a) => a.id !== watchedAccountId),
    [accounts, watchedAccountId],
  );

  const onSubmit = handleSubmit((values) => {
    const parsedUnits = Number(values.amountUnits.replace(",", "."));
    if (!Number.isFinite(parsedUnits) || parsedUnits <= 0) {
      toast.error("Monto inválido");
      return;
    }
    const amountCents = Math.round(parsedUnits * 100);
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      toast.error("Monto inválido");
      return;
    }

    const description = values.description.trim() || null;

    startTransition(async () => {
      let result: { ok: boolean; error?: string };
      if (values.type === "income") {
        result = await createIncomeAction({
          workspaceId,
          accountId: values.accountId,
          categoryId: values.categoryId,
          amountCents,
          occurredOn: values.occurredOn,
          description,
        });
      } else if (values.type === "expense") {
        result = await createExpenseAction({
          workspaceId,
          accountId: values.accountId,
          categoryId: values.categoryId,
          amountCents,
          occurredOn: values.occurredOn,
          description,
        });
      } else {
        result = await createTransferAction({
          workspaceId,
          accountId: values.accountId,
          counterpartyAccountId: values.counterpartyAccountId,
          amountCents,
          occurredOn: values.occurredOn,
          description,
        });
      }

      if (!result.ok) {
        toast.error(result.error ?? "No pudimos registrar el movimiento");
        return;
      }

      const successMessage =
        values.type === "income"
          ? "Ingreso registrado"
          : values.type === "expense"
            ? "Gasto registrado"
            : "Transferencia registrada";
      toast.success(successMessage);
      reset({
        type: values.type,
        amountUnits: "",
        occurredOn: values.occurredOn,
        accountId: values.accountId,
        counterpartyAccountId:
          values.counterpartyAccountId || defaultCounterpartyId,
        categoryId: "",
        description: "",
      });
      router.refresh();
    });
  });

  const isBusy = isPending || isSubmitting;
  const showCategory = watchedType !== "transfer";
  const showCounterparty = watchedType === "transfer";

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)_minmax(0,160px)]">
        <div className="space-y-2">
          <label
            htmlFor="tx-type"
            className="text-sm font-medium text-muted-foreground"
          >
            Tipo
          </label>
          <select
            id="tx-type"
            className={SELECT_CLASSES}
            {...register("type")}
          >
            {TRANSACTION_TYPES.map((code) => (
              <option key={code} value={code}>
                {TRANSACTION_TYPE_LABEL_ES[code]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="tx-description"
            className="text-sm font-medium text-muted-foreground"
          >
            Descripción (opcional)
          </label>
          <Input
            id="tx-description"
            placeholder="Supermercado, sueldo, transferencia a ahorro…"
            {...register("description")}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="tx-amount"
            className="text-sm font-medium text-muted-foreground"
          >
            Monto ({workspaceCurrency})
          </label>
          <Input
            id="tx-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0,00"
            aria-invalid={Boolean(errors.amountUnits)}
            {...register("amountUnits", { required: true })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,160px)]">
        <div className="space-y-2">
          <label
            htmlFor="tx-account"
            className="text-sm font-medium text-muted-foreground"
          >
            {watchedType === "transfer" ? "Cuenta origen" : "Cuenta"}
          </label>
          <select
            id="tx-account"
            className={SELECT_CLASSES}
            aria-invalid={Boolean(errors.accountId)}
            {...register("accountId", { required: true })}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {showCounterparty ? (
          <div className="space-y-2">
            <label
              htmlFor="tx-counterparty"
              className="text-sm font-medium text-muted-foreground"
            >
              Cuenta destino
            </label>
            <select
              id="tx-counterparty"
              className={SELECT_CLASSES}
              aria-invalid={Boolean(errors.counterpartyAccountId)}
              {...register("counterpartyAccountId", { required: true })}
            >
              {counterpartyOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-2">
            <label
              htmlFor="tx-category"
              className="text-sm font-medium text-muted-foreground"
            >
              Categoría
            </label>
            <select
              id="tx-category"
              className={SELECT_CLASSES}
              disabled={!showCategory}
              aria-invalid={Boolean(errors.categoryId)}
              {...register("categoryId", {
                required: showCategory,
              })}
            >
              <option value="">Elegí una categoría…</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="tx-date"
            className="text-sm font-medium text-muted-foreground"
          >
            Fecha
          </label>
          <Input
            id="tx-date"
            type="date"
            aria-invalid={Boolean(errors.occurredOn)}
            {...register("occurredOn", { required: true })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isBusy || accounts.length === 0}>
          {isBusy ? "Guardando..." : "Registrar movimiento"}
        </Button>
      </div>
    </form>
  );
}
