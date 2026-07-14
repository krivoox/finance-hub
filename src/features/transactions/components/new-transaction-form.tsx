"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  createExpenseAction,
  createIncomeAction,
  createTransferAction,
} from "@/features/transactions/actions";
import { createExpenseWithSplitAction } from "@/features/splits/actions";
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

type MemberOption = {
  userId: string;
  displayName: string;
};

type SplitMethod = "equal" | "exact" | "percentage";

type NewTransactionFormProps = {
  workspaceId: string;
  workspaceCurrency: string;
  accounts: readonly AccountOption[];
  categories: readonly CategoryOption[];
  /** When set, expense form can attach a group split. */
  groupMembers?: readonly MemberOption[];
  currentUserId?: string;
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

function parseAmountCents(raw: string): number | null {
  const parsedUnits = Number(raw.replace(",", "."));
  if (!Number.isFinite(parsedUnits) || parsedUnits <= 0) return null;
  const amountCents = Math.round(parsedUnits * 100);
  if (!Number.isInteger(amountCents) || amountCents <= 0) return null;
  return amountCents;
}

const SELECT_CLASSES =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function NewTransactionForm({
  workspaceId,
  workspaceCurrency,
  accounts,
  categories,
  groupMembers = [],
  currentUserId,
}: NewTransactionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const canSplit = groupMembers.length > 0;

  const [shareExpense, setShareExpense] = useState(false);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal");
  const [paidByUserId, setPaidByUserId] = useState(
    currentUserId ?? groupMembers[0]?.userId ?? "",
  );
  const [participantIds, setParticipantIds] = useState<string[]>(() =>
    groupMembers.map((m) => m.userId),
  );
  const [exactUnitsByUser, setExactUnitsByUser] = useState<
    Record<string, string>
  >(() => Object.fromEntries(groupMembers.map((m) => [m.userId, ""])));
  const [percentByUser, setPercentByUser] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        groupMembers.map((m) => [
          m.userId,
          groupMembers.length > 0
            ? String(Math.floor(100 / groupMembers.length))
            : "",
        ]),
      ),
  );

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
  const watchedAmountUnits = useWatch({ control, name: "amountUnits" });

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

  const showSplitPanel =
    canSplit && watchedType === "expense" && shareExpense;

  const equalPreview = useMemo(() => {
    const total = parseAmountCents(watchedAmountUnits ?? "");
    if (!total || participantIds.length === 0) return null;
    const sorted = [...participantIds].toSorted((a, b) => a.localeCompare(b));
    const n = sorted.length;
    const base = Math.floor(total / n);
    const remainder = total % n;
    return sorted.map((userId, i) => ({
      userId,
      cents: base + (i < remainder ? 1 : 0),
    }));
  }, [watchedAmountUnits, participantIds]);

  function toggleParticipant(userId: string) {
    setParticipantIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  }

  const onSubmit = handleSubmit((values) => {
    const amountCents = parseAmountCents(values.amountUnits);
    if (amountCents === null) {
      toast.error("Monto inválido");
      return;
    }

    const description = values.description.trim() || null;

    startTransition(async () => {
      let result: { ok: boolean; error?: string };

      if (values.type === "expense" && shareExpense && canSplit) {
        if (!paidByUserId) {
          toast.error("Indicá quién pagó el gasto");
          return;
        }
        if (splitMethod === "equal") {
          if (participantIds.length === 0) {
            toast.error("Elegí al menos un participante");
            return;
          }
          result = await createExpenseWithSplitAction({
            workspaceId,
            accountId: values.accountId,
            categoryId: values.categoryId,
            amountCents,
            occurredOn: values.occurredOn,
            description,
            paidByUserId,
            method: "equal",
            participantUserIds: participantIds,
          });
        } else if (splitMethod === "exact") {
          const exactShares = groupMembers
            .map((m) => {
              const raw = exactUnitsByUser[m.userId] ?? "";
              if (!raw.trim()) return null;
              const cents = parseAmountCents(raw);
              if (cents === null) return null;
              return { userId: m.userId, cents };
            })
            .filter((s): s is { userId: string; cents: number } => s !== null);
          if (exactShares.length === 0) {
            toast.error("Indicá al menos una parte con monto");
            return;
          }
          const sum = exactShares.reduce((acc, s) => acc + s.cents, 0);
          if (sum !== amountCents) {
            toast.error(
              `La suma de las partes (${(sum / 100).toFixed(2)}) debe igualar el monto total`,
            );
            return;
          }
          result = await createExpenseWithSplitAction({
            workspaceId,
            accountId: values.accountId,
            categoryId: values.categoryId,
            amountCents,
            occurredOn: values.occurredOn,
            description,
            paidByUserId,
            method: "exact",
            exactShares,
          });
        } else {
          const percentages = groupMembers
            .map((m) => {
              const raw = percentByUser[m.userId] ?? "";
              if (!raw.trim()) return null;
              const percent = Number(raw);
              if (!Number.isInteger(percent) || percent < 0) return null;
              return { userId: m.userId, percent };
            })
            .filter(
              (s): s is { userId: string; percent: number } => s !== null,
            );
          if (percentages.length === 0) {
            toast.error("Indicá al menos un porcentaje");
            return;
          }
          const sum = percentages.reduce((acc, s) => acc + s.percent, 0);
          if (sum !== 100) {
            toast.error(`Los porcentajes deben sumar 100 (ahora ${sum})`);
            return;
          }
          result = await createExpenseWithSplitAction({
            workspaceId,
            accountId: values.accountId,
            categoryId: values.categoryId,
            amountCents,
            occurredOn: values.occurredOn,
            description,
            paidByUserId,
            method: "percentage",
            percentages,
          });
        }
      } else if (values.type === "income") {
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
          : values.type === "expense" && shareExpense
            ? "Gasto compartido registrado"
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
      setShareExpense(false);
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

      {canSplit && watchedType === "expense" ? (
        <div className="space-y-4 border-t border-border pt-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4 rounded border-input"
              checked={shareExpense}
              onChange={(e) => setShareExpense(e.target.checked)}
            />
            <span>
              <span className="font-medium text-foreground">
                Compartir y dividir este gasto
              </span>
              <span className="mt-0.5 block text-muted-foreground">
                Repartí el monto entre miembros del grupo para actualizar
                balances.
              </span>
            </span>
          </label>

          {showSplitPanel ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="split-method"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Cómo dividir
                  </label>
                  <select
                    id="split-method"
                    className={SELECT_CLASSES}
                    value={splitMethod}
                    onChange={(e) =>
                      setSplitMethod(e.target.value as SplitMethod)
                    }
                  >
                    <option value="equal">Partes iguales</option>
                    <option value="exact">Montos exactos</option>
                    <option value="percentage">Porcentajes</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="split-payer"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Quién pagó
                  </label>
                  <select
                    id="split-payer"
                    className={SELECT_CLASSES}
                    value={paidByUserId}
                    onChange={(e) => setPaidByUserId(e.target.value)}
                  >
                    {groupMembers.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {splitMethod === "equal" ? (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-muted-foreground">
                    Participantes
                  </legend>
                  <ul className="divide-y divide-border">
                    {groupMembers.map((m) => {
                      const preview = equalPreview?.find(
                        (p) => p.userId === m.userId,
                      );
                      return (
                        <li
                          key={m.userId}
                          className="flex items-center justify-between gap-3 py-2"
                        >
                          <label className="flex items-center gap-2 text-sm text-foreground">
                            <input
                              type="checkbox"
                              className="size-4 rounded border-input"
                              checked={participantIds.includes(m.userId)}
                              onChange={() => toggleParticipant(m.userId)}
                            />
                            {m.displayName}
                          </label>
                          {preview && participantIds.includes(m.userId) ? (
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {(preview.cents / 100).toFixed(2)}{" "}
                              {workspaceCurrency}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              ) : null}

              {splitMethod === "exact" ? (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-muted-foreground">
                    Parte de cada uno ({workspaceCurrency})
                  </legend>
                  <ul className="space-y-2">
                    {groupMembers.map((m) => (
                      <li
                        key={m.userId}
                        className="grid grid-cols-[1fr_120px] items-center gap-3"
                      >
                        <span className="text-sm text-foreground">
                          {m.displayName}
                        </span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          placeholder="0,00"
                          value={exactUnitsByUser[m.userId] ?? ""}
                          onChange={(e) =>
                            setExactUnitsByUser((prev) => ({
                              ...prev,
                              [m.userId]: e.target.value,
                            }))
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </fieldset>
              ) : null}

              {splitMethod === "percentage" ? (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-muted-foreground">
                    Porcentaje de cada uno
                  </legend>
                  <ul className="space-y-2">
                    {groupMembers.map((m) => (
                      <li
                        key={m.userId}
                        className="grid grid-cols-[1fr_100px] items-center gap-3"
                      >
                        <span className="text-sm text-foreground">
                          {m.displayName}
                        </span>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={100}
                          step={1}
                          placeholder="%"
                          value={percentByUser[m.userId] ?? ""}
                          onChange={(e) =>
                            setPercentByUser((prev) => ({
                              ...prev,
                              [m.userId]: e.target.value,
                            }))
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </fieldset>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isBusy || accounts.length === 0}>
          {isBusy
            ? "Guardando..."
            : shareExpense && watchedType === "expense"
              ? "Registrar gasto compartido"
              : "Registrar movimiento"}
        </Button>
      </div>
    </form>
  );
}
