"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  createExpenseAction,
  createIncomeAction,
  createTransferAction,
} from "@/features/transactions/actions";
import { createExpenseWithSplitAction } from "@/features/splits/actions";
import { ACCOUNT_CURRENCIES } from "@/domain/money/currencies";
import {
  CREATEABLE_TRANSACTION_TYPES,
  filterAccountsByCurrency,
  filterPaymentGroupsByCurrency,
  resolveTransactionFormCurrency,
  type CreateableTransactionType,
} from "@/features/transactions/domain";
import { CategoryPicker } from "@/features/categories/components/category-picker";
import {
  FormActions,
  FormField,
  FormSection,
  FormStack,
  SegmentedControl,
} from "@/components/form-sheet";
import { DateField } from "@/components/date-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nativeSelectClassName } from "@/components/ui/native-select";
import { refreshAfterMutation } from "@/lib/navigation";
import { TRANSACTION_TYPE_LABEL_ES } from "./transaction-type-labels";

type AccountOption = {
  id: string;
  name: string;
  currency: string;
  workspaceId?: string;
  workspaceName?: string;
  workspaceType?: "personal" | "group";
};

type PaymentAccountGroup = {
  workspaceId: string;
  workspaceName: string;
  workspaceType: "personal" | "group";
  accounts: readonly AccountOption[];
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
  workspaceName: string;
  workspaceCurrency: string;
  accounts: readonly AccountOption[];
  paymentAccountGroups?: readonly PaymentAccountGroup[];
  categories: readonly CategoryOption[];
  groupMembers?: readonly MemberOption[];
  currentUserId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

type FormValues = {
  type: CreateableTransactionType;
  currency: (typeof ACCOUNT_CURRENCIES)[number];
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

const TYPE_OPTIONS = CREATEABLE_TRANSACTION_TYPES.map((value) => ({
  value,
  label: TRANSACTION_TYPE_LABEL_ES[value],
}));

const CURRENCY_OPTIONS = ACCOUNT_CURRENCIES.map((value) => ({
  value,
  label: value,
}));

const SELECT_CLASSES = nativeSelectClassName;

export function NewTransactionForm({
  workspaceId,
  workspaceName,
  workspaceCurrency,
  accounts,
  paymentAccountGroups = [],
  categories,
  groupMembers = [],
  currentUserId,
  onSuccess,
  onCancel,
}: NewTransactionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const canSplit = groupMembers.length > 0;

  const flatPaymentAccounts = useMemo(
    () => paymentAccountGroups.flatMap((g) => g.accounts),
    [paymentAccountGroups],
  );

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

  const defaultCurrency = resolveTransactionFormCurrency({
    workspaceBaseCurrency: workspaceCurrency,
  });
  const accountsForDefaultCurrency = filterAccountsByCurrency(
    accounts,
    defaultCurrency,
  );
  const defaultAccountId = accountsForDefaultCurrency[0]?.id ?? "";
  const defaultCounterpartyId =
    accountsForDefaultCurrency.find((a) => a.id !== defaultAccountId)?.id ??
    "";
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      type: "expense",
      currency: defaultCurrency,
      amountUnits: "",
      occurredOn: todayIsoDate(),
      accountId: defaultAccountId,
      counterpartyAccountId: defaultCounterpartyId,
      categoryId: "",
      description: "",
    },
  });

  const watchedType = useWatch({ control, name: "type" });
  const watchedCurrency = useWatch({ control, name: "currency" });
  const watchedAccountId = useWatch({ control, name: "accountId" });
  const watchedAmountUnits = useWatch({ control, name: "amountUnits" });

  const selectedCurrency = resolveTransactionFormCurrency({
    selected: watchedCurrency,
    workspaceBaseCurrency: workspaceCurrency,
  });

  const accountsForCurrency = useMemo(
    () => filterAccountsByCurrency(accounts, selectedCurrency),
    [accounts, selectedCurrency],
  );

  const paymentGroupsForCurrency = useMemo(
    () =>
      filterPaymentGroupsByCurrency(paymentAccountGroups, selectedCurrency),
    [paymentAccountGroups, selectedCurrency],
  );

  const flatPaymentAccountsForCurrency = useMemo(
    () => paymentGroupsForCurrency.flatMap((g) => g.accounts),
    [paymentGroupsForCurrency],
  );

  const filteredCategories = useMemo(
    () =>
      watchedType === "transfer"
        ? []
        : categories.filter((c) => c.kind === watchedType),
    [categories, watchedType],
  );

  const counterpartyOptions = useMemo(
    () => accountsForCurrency.filter((a) => a.id !== watchedAccountId),
    [accountsForCurrency, watchedAccountId],
  );

  const selectedPaymentAccount =
    flatPaymentAccountsForCurrency.find((a) => a.id === watchedAccountId) ??
    accountsForCurrency.find((a) => a.id === watchedAccountId) ??
    flatPaymentAccounts.find((a) => a.id === watchedAccountId) ??
    accounts.find((a) => a.id === watchedAccountId);

  function applyCurrency(nextCurrency: (typeof ACCOUNT_CURRENCIES)[number]) {
    setValue("currency", nextCurrency);
    const nextAccounts = filterAccountsByCurrency(accounts, nextCurrency);
    const nextPaymentAccounts = filterPaymentGroupsByCurrency(
      paymentAccountGroups,
      nextCurrency,
    ).flatMap((g) => g.accounts);
    const selectable =
      nextAccounts.length > 0 ? nextAccounts : nextPaymentAccounts;
    const nextAccountId = selectable[0]?.id ?? "";
    const nextCounterpartyId =
      nextAccounts.find((a) => a.id !== nextAccountId)?.id ?? "";
    setValue("accountId", nextAccountId);
    setValue("counterpartyAccountId", nextCounterpartyId);
  }

  const isExternalPayment =
    Boolean(selectedPaymentAccount?.workspaceId) &&
    selectedPaymentAccount?.workspaceId !== workspaceId;

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
    const currency = resolveTransactionFormCurrency({
      selected: values.currency,
      workspaceBaseCurrency: workspaceCurrency,
    });

    startTransition(async () => {
      let result: { ok: boolean; error?: string };

      if (values.type === "expense" && shareExpense && canSplit) {
        const effectivePaidBy =
          isExternalPayment &&
          selectedPaymentAccount?.workspaceType === "personal" &&
          currentUserId
            ? currentUserId
            : paidByUserId;
        if (!effectivePaidBy) {
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
            currency,
            paidByUserId: effectivePaidBy,
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
            currency,
            paidByUserId: effectivePaidBy,
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
            currency,
            paidByUserId: effectivePaidBy,
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
          currency,
        });
      } else if (values.type === "expense") {
        result = await createExpenseAction({
          workspaceId,
          accountId: values.accountId,
          categoryId: values.categoryId,
          amountCents,
          occurredOn: values.occurredOn,
          description,
          currency,
        });
      } else {
        result = await createTransferAction({
          workspaceId,
          accountId: values.accountId,
          counterpartyAccountId: values.counterpartyAccountId,
          amountCents,
          occurredOn: values.occurredOn,
          description,
          currency,
        });
      }

      if (!result.ok) {
        toast.error(result.error ?? "No pudimos registrar la transacción");
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
        currency,
        amountUnits: "",
        occurredOn: values.occurredOn,
        accountId: values.accountId,
        counterpartyAccountId:
          values.counterpartyAccountId || defaultCounterpartyId,
        categoryId: "",
        description: "",
      });
      setShareExpense(false);
      onSuccess?.();
      refreshAfterMutation(router);
    });
  });

  const isBusy = isPending || isSubmitting;
  const showCategory = watchedType !== "transfer";
  const showCounterparty = watchedType === "transfer";
  const hasAccountsForCurrency =
    accountsForCurrency.length > 0 ||
    (watchedType !== "transfer" && flatPaymentAccountsForCurrency.length > 0);
  const currencyHintLabel =
    selectedCurrency === "USD" ? "dólares (USD)" : "pesos (ARS)";

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FormStack>
        <FormSection>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <FormField label="Tipo" htmlFor="tx-type">
                <SegmentedControl
                  id="tx-type"
                  ariaLabel="Tipo de transacción"
                  value={field.value}
                  options={TYPE_OPTIONS}
                  disabled={isBusy}
                  onChange={(next) => {
                    field.onChange(next);
                    setValue("categoryId", "");
                    if (next !== "expense") setShareExpense(false);
                  }}
                />
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <FormField
                label="Moneda"
                htmlFor="tx-currency"
                hint="Solo cuentas de esta moneda"
              >
                <SegmentedControl
                  id="tx-currency"
                  ariaLabel="Moneda de la transacción"
                  value={field.value}
                  options={CURRENCY_OPTIONS}
                  disabled={isBusy}
                  onChange={(next) => {
                    applyCurrency(next);
                  }}
                />
              </FormField>
            )}
          />

          <FormField
            label="Monto"
            htmlFor="tx-amount"
            hint={`En ${currencyHintLabel}`}
          >
            <Input
              id="tx-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="0,00"
              className="h-11 text-base tabular-nums sm:h-9 sm:text-sm"
              aria-invalid={Boolean(errors.amountUnits)}
              {...register("amountUnits", { required: true })}
            />
          </FormField>

          <FormField label="Descripción" htmlFor="tx-description" optional>
            <Input
              id="tx-description"
              placeholder="Supermercado, sueldo…"
              {...register("description")}
            />
          </FormField>
        </FormSection>

        <FormSection title="Cuenta y categoría">
          {!hasAccountsForCurrency ? (
            <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
              No hay cuentas activas en {selectedCurrency}. Creá una cuenta en
              esa moneda o cambiá el selector.
            </p>
          ) : null}

          <FormField
            label={
              watchedType === "transfer"
                ? "Cuenta origen"
                : watchedType === "income"
                  ? "Se acredita en"
                  : "Se descuenta de"
            }
            htmlFor="tx-account"
          >
            <select
              id="tx-account"
              className={SELECT_CLASSES}
              aria-invalid={Boolean(errors.accountId)}
              disabled={!hasAccountsForCurrency || isBusy}
              {...register("accountId", { required: true })}
            >
              {watchedType === "transfer" ||
              paymentGroupsForCurrency.length === 0
                ? accountsForCurrency.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {a.currency}
                    </option>
                  ))
                : paymentGroupsForCurrency.map((group) => (
                    <optgroup
                      key={group.workspaceId}
                      label={
                        group.workspaceId === workspaceId
                          ? `Este espacio · ${group.workspaceName}`
                          : group.workspaceType === "personal"
                            ? `Tu espacio personal · ${group.workspaceName}`
                            : group.workspaceName
                      }
                    >
                      {group.accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} · {a.currency}
                        </option>
                      ))}
                    </optgroup>
                  ))}
            </select>
          </FormField>

          {showCounterparty ? (
            <FormField label="Cuenta destino" htmlFor="tx-counterparty">
              <select
                id="tx-counterparty"
                className={SELECT_CLASSES}
                aria-invalid={Boolean(errors.counterpartyAccountId)}
                disabled={counterpartyOptions.length === 0 || isBusy}
                {...register("counterpartyAccountId", { required: true })}
              >
                {counterpartyOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.currency}
                  </option>
                ))}
              </select>
            </FormField>
          ) : (
            <FormField label="Categoría" htmlFor="tx-category">
              <Controller
                control={control}
                name="categoryId"
                rules={{ required: showCategory }}
                render={({ field }) => (
                  <CategoryPicker
                    mode="single"
                    id="tx-category"
                    categories={filteredCategories}
                    value={field.value || null}
                    onChange={(id) => field.onChange(id ?? "")}
                    disabled={!showCategory || isBusy}
                    aria-invalid={Boolean(errors.categoryId)}
                    placeholder="Elegir categoría"
                  />
                )}
              />
            </FormField>
          )}

          <FormField label="Fecha" htmlFor="tx-date">
            <Controller
              control={control}
              name="occurredOn"
              rules={{ required: true }}
              render={({ field }) => (
                <DateField
                  id="tx-date"
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

          {watchedType !== "transfer" && selectedPaymentAccount ? (
            <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-foreground">
              Se registra en <strong>{workspaceName}</strong>
              {" · "}
              {watchedType === "income" ? "Se acredita en" : "Se descuenta de"}{" "}
              <strong>
                {isExternalPayment
                  ? `${selectedPaymentAccount.workspaceName} · ${selectedPaymentAccount.name}`
                  : selectedPaymentAccount.name}
              </strong>
              {" · "}
              <strong>{selectedCurrency}</strong>
              {isExternalPayment ? (
                <span className="mt-1 block text-xs text-muted-foreground">
                  La transacción queda en este espacio; el saldo cambia en la
                  cuenta de otro espacio.
                </span>
              ) : null}
            </p>
          ) : null}
        </FormSection>

        {canSplit && watchedType === "expense" ? (
          <FormSection
            title="División"
            description="Solo para gastos del grupo."
          >
            <label className="flex items-start gap-3 rounded-lg border border-border px-3 py-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-input"
                checked={shareExpense}
                onChange={(e) => setShareExpense(e.target.checked)}
              />
              <span>
                <span className="font-medium text-foreground">
                  Compartir este gasto
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Repartí el monto entre miembros para actualizar balances.
                </span>
              </span>
            </label>

            {showSplitPanel ? (
              <div className="space-y-4">
                <FormField label="Cómo dividir" htmlFor="split-method">
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
                </FormField>

                <FormField label="Quién pagó" htmlFor="split-payer">
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
                </FormField>

                {splitMethod === "equal" ? (
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-foreground">
                      Participantes
                    </legend>
                    <ul className="divide-y divide-border rounded-lg border border-border">
                      {groupMembers.map((m) => {
                        const preview = equalPreview?.find(
                          (p) => p.userId === m.userId,
                        );
                        return (
                          <li
                            key={m.userId}
                            className="flex items-center justify-between gap-3 px-3 py-2.5"
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
                                {selectedCurrency}
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
                    <legend className="text-sm font-medium text-foreground">
                      Parte de cada uno ({selectedCurrency})
                    </legend>
                    <ul className="space-y-3">
                      {groupMembers.map((m) => (
                        <li key={m.userId} className="space-y-1.5">
                          <span className="text-sm text-foreground">
                            {m.displayName}
                          </span>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.01"
                            placeholder="0,00"
                            className="tabular-nums"
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
                    <legend className="text-sm font-medium text-foreground">
                      Porcentaje de cada uno
                    </legend>
                    <ul className="space-y-3">
                      {groupMembers.map((m) => (
                        <li key={m.userId} className="space-y-1.5">
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
                            className="tabular-nums"
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
          </FormSection>
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
          disabled={isBusy || !hasAccountsForCurrency}
        >
          {isBusy
            ? "Guardando..."
            : shareExpense && watchedType === "expense"
              ? "Registrar gasto compartido"
              : "Registrar"}
        </Button>
      </FormActions>
    </form>
  );
}
