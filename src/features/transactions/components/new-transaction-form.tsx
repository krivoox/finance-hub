"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  createExpenseAction,
  createIncomeAction,
  createTransferAction,
} from "@/features/transactions/actions";
import { createExpenseWithSplitAction } from "@/features/splits/actions";
import { ExpenseSplitFields } from "@/features/splits/components/expense-split-fields";
import type { ExpenseSplitGroupOption } from "@/features/splits/components/expense-split-fields";
import { ACCOUNT_CURRENCIES } from "@/domain/money/currencies";
import {
  CREATEABLE_TRANSACTION_TYPES,
  filterAccountsByCurrency,
  resolveTransactionFormCurrency,
  type CreateableTransactionType,
} from "@/features/transactions/domain";
import { CategoryPicker } from "@/features/categories/components/category-picker";
import {
  FormActions,
  FormField,
  FormSection,
  FormSheetBody,
  FormStack,
  SegmentedControl,
} from "@/components/form-sheet";
import { AmountInput } from "@/components/amount-input";
import { DateField } from "@/components/date-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseAmountCents } from "@/domain/money/parse-amount";
import { FormSelect } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  clearOfflineDraftFromStorage,
  readOfflineDraftFromStorage,
} from "@/lib/offline-draft";
import { refreshAfterMutation } from "@/lib/navigation";
import { TRANSACTION_TYPE_LABEL_ES } from "./transaction-type-labels";
import { useTransactionFeedbackStore } from "../stores/transaction-feedback-store";

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
  splitGroups?: readonly ExpenseSplitGroupOption[];
  currentUserId?: string;
  /** Prefill from PWA shortcuts / `?new=expense|income`. */
  initialType?: CreateableTransactionType;
  /**
   * `sheet`: fill the FormSheet, pin Registrar, no Cancelar (X closes).
   * `page`: standalone `/transactions/new` with Cancelar.
   */
  layout?: "page" | "sheet";
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

const TYPE_OPTIONS = CREATEABLE_TRANSACTION_TYPES.map((value) => ({
  value,
  label: TRANSACTION_TYPE_LABEL_ES[value],
}));

const CURRENCY_OPTIONS = ACCOUNT_CURRENCIES.map((value) => ({
  value,
  label: value,
}));

export function NewTransactionForm({
  workspaceId,
  workspaceCurrency,
  accounts,
  categories,
  splitGroups = [],
  currentUserId,
  initialType = "expense",
  layout = "page",
  onSuccess,
  onCancel,
}: NewTransactionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const showFeedback = useTransactionFeedbackStore((s) => s.showFeedback);
  const [shareExpense, setShareExpense] = useState(false);
  const [selectedSplitGroupId, setSelectedSplitGroupId] = useState(
    splitGroups[0]?.id ?? "",
  );

  useEffect(() => {
    if (splitGroups.some((group) => group.id === selectedSplitGroupId)) return;
    setSelectedSplitGroupId(splitGroups[0]?.id ?? "");
  }, [splitGroups, selectedSplitGroupId]);

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

  const offlineDraft =
    typeof window !== "undefined"
      ? readOfflineDraftFromStorage(window.sessionStorage)
      : null;
  const draftType =
    offlineDraft?.type === "income" || offlineDraft?.type === "expense"
      ? offlineDraft.type
      : initialType;

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      type: draftType,
      currency: defaultCurrency,
      amountUnits: offlineDraft?.amountUnits ?? "",
      occurredOn: offlineDraft?.occurredOn || todayIsoDate(),
      accountId: defaultAccountId,
      counterpartyAccountId: defaultCounterpartyId,
      categoryId: "",
      description: offlineDraft?.description ?? "",
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

  function applyCurrency(nextCurrency: (typeof ACCOUNT_CURRENCIES)[number]) {
    setValue("currency", nextCurrency);
    const nextAccounts = filterAccountsByCurrency(accounts, nextCurrency);
    const nextAccountId = nextAccounts[0]?.id ?? "";
    const nextCounterpartyId =
      nextAccounts.find((a) => a.id !== nextAccountId)?.id ?? "";
    setValue("accountId", nextAccountId);
    setValue("counterpartyAccountId", nextCounterpartyId);
  }

  const groupsForCurrency = splitGroups.filter(
    (group) => group.currency === selectedCurrency,
  );
  const selectedSplitGroup =
    groupsForCurrency.find((g) => g.id === selectedSplitGroupId) ??
    groupsForCurrency[0];
  const payerMemberId =
    selectedSplitGroup?.members.find((m) => m.userId === currentUserId)
      ?.memberId ?? null;
  const splitAmountCents = parseAmountCents(watchedAmountUnits ?? "");

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

      if (values.type === "expense" && shareExpense) {
        if (!selectedSplitGroup) {
          toast.error("Elegí un grupo o creá uno primero");
          return;
        }
        result = await createExpenseWithSplitAction({
          workspaceId,
          splitGroupId: selectedSplitGroup.id,
          accountId: values.accountId,
          categoryId: values.categoryId,
          amountCents,
          occurredOn: values.occurredOn,
          description,
          currency,
          method: "equal",
        });
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

      showFeedback({
        amountCents,
        currency,
        kind: values.type,
      });
      clearOfflineDraftFromStorage(
        typeof window !== "undefined" ? window.sessionStorage : null,
      );
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
  const hasAccountsForCurrency = accountsForCurrency.length > 0;
  const currencyHintLabel =
    selectedCurrency === "USD" ? "dólares (USD)" : "pesos (ARS)";

  const fields = (
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
            <AmountInput
              id="tx-amount"
              className="h-11 text-base sm:h-9 sm:text-sm"
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
            <FormSelect
              control={control}
              name="accountId"
              id="tx-account"
              rules={{ required: true }}
              disabled={!hasAccountsForCurrency || isBusy}
              invalid={Boolean(errors.accountId)}
              placeholder="Elegí una cuenta"
              options={accountsForCurrency.map((a) => ({
                value: a.id,
                label: `${a.name} · ${a.currency}`,
              }))}
            />
          </FormField>

          {showCounterparty ? (
            <FormField label="Cuenta destino" htmlFor="tx-counterparty">
              <FormSelect
                control={control}
                name="counterpartyAccountId"
                id="tx-counterparty"
                rules={{ required: true }}
                disabled={counterpartyOptions.length === 0 || isBusy}
                invalid={Boolean(errors.counterpartyAccountId)}
                placeholder="Elegí una cuenta"
                options={counterpartyOptions.map((a) => ({
                  value: a.id,
                  label: `${a.name} · ${a.currency}`,
                }))}
              />
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
        </FormSection>

        {watchedType === "expense" ? (
          <ExpenseSplitFields
            enabled={shareExpense}
            onEnabledChange={setShareExpense}
            groups={splitGroups}
            selectedGroupId={selectedSplitGroup?.id ?? selectedSplitGroupId}
            onGroupChange={setSelectedSplitGroupId}
            amountCents={splitAmountCents}
            payerMemberId={payerMemberId}
            currency={selectedCurrency}
          />
        ) : null}
      </FormStack>
  );

  const actions = (
    <FormActions sticky={layout === "sheet"}>
      {layout !== "sheet" && onCancel ? (
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
        className="w-full"
        disabled={isBusy || !hasAccountsForCurrency}
      >
        {isBusy
          ? "Guardando..."
          : shareExpense && watchedType === "expense"
            ? "Registrar gasto compartido"
            : "Registrar"}
      </Button>
    </FormActions>
  );

  return (
    <form
      className={cn(
        "flex flex-col",
        layout === "sheet" ? "min-h-0 flex-1" : "gap-6",
      )}
      onSubmit={onSubmit}
      noValidate
    >
      {layout === "sheet" ? <FormSheetBody>{fields}</FormSheetBody> : fields}
      {actions}
    </form>
  );
}
