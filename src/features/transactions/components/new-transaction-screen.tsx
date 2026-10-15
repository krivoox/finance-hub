"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Plus,
  Repeat,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { AmountInput } from "@/components/amount-input";
import { DateField } from "@/components/date-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adjustmentTargetLabel,
  buildAdjustmentPreview,
  formatAdjustmentCurrent,
  isCreditCardAccount,
} from "@/features/accounts/components/adjustment-preview";
import type { AccountType } from "@/features/accounts/domain";
import { splitLeadingEmoji } from "@/features/categories/domain";
import { createCoreTransactionAction } from "@/features/transactions/actions";
import {
  computeGroupSplit,
  frequencyHint,
  hasGroupMemberName,
  TRANSACTION_FREQUENCIES,
  TRANSACTION_FREQUENCY_LABELS,
  type GroupSplitMode,
  type TransactionFrequency,
} from "@/features/transactions/domain";
import { parseAmountCents } from "@/domain/money/parse-amount";
import { formatMoney } from "@/lib/format-money";
import { navigateAndRefresh } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import {
  CORE_TYPE_ORDER,
  CORE_TYPE_THEME,
  type CoreTransactionType,
} from "./transaction-type-theme";

export type CoreAccountOption = {
  id: string;
  name: string;
  currency: string;
  type: AccountType;
  currentBalanceCents: number;
};

export type CoreCategoryOption = {
  id: string;
  name: string;
  kind: "income" | "expense";
  usageCount?: number;
};

export type NewTransactionScreenProps = {
  workspaceId: string;
  workspaceCurrency: string;
  accounts: readonly CoreAccountOption[];
  categories: readonly CoreCategoryOption[];
  initialType?: CoreTransactionType;
  onSaved?: () => void;
  onCancel?: () => void;
};

export const ACCOUNT_TYPE_EMOJI: Record<AccountType, string> = {
  checking: "🏦",
  savings: "💰",
  cash: "💵",
  credit_card: "💳",
  virtual_wallet: "📱",
  other: "🏛️",
};

/** SPEC-23 — suggested people for the ad-hoc group split (free text, no contacts). */
const SUGGESTED_GROUP_MEMBERS = [
  "Alex",
  "Jamie",
  "Sam",
  "Morgan",
  "Taylor",
  "Jordan",
] as const;

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

type MemberDraft = {
  id: string;
  name: string;
  amountUnits: string;
};

function newMemberId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function NewTransactionScreen({
  workspaceId,
  workspaceCurrency,
  accounts,
  categories,
  initialType = "expense",
  onSaved,
  onCancel,
}: NewTransactionScreenProps) {
  const router = useRouter();
  const handleSaved =
    onSaved ?? (() => navigateAndRefresh(router, "/dashboard"));
  const handleCancel = onCancel ?? (() => router.push("/transactions"));
  const [type, setType] = React.useState<CoreTransactionType>(initialType);
  const [amountUnits, setAmountUnits] = React.useState("");
  const [accountId, setAccountId] = React.useState(accounts[0]?.id ?? "");
  const [counterpartyId, setCounterpartyId] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [occurredOn, setOccurredOn] = React.useState(todayIsoDate());
  const [description, setDescription] = React.useState("");
  const [frequency, setFrequency] = React.useState<TransactionFrequency>("once");
  const [groupSplitEnabled, setGroupSplitEnabled] = React.useState(false);
  const [groupSplitMode, setGroupSplitMode] =
    React.useState<GroupSplitMode>("equal");
  const [members, setMembers] = React.useState<MemberDraft[]>([]);
  const [memberDraft, setMemberDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const amountRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    amountRef.current?.focus();
  }, []);

  const blocked = busy || saved;
  const theme = CORE_TYPE_THEME[type];
  const isAdjustment = type === "adjustment";
  const isTransfer = type === "transfer";
  const isExpense = type === "expense";
  const isIncome = type === "income";

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const currency = selectedAccount?.currency ?? workspaceCurrency;
  const isCard = isCreditCardAccount(selectedAccount?.type);

  const amountCents = isAdjustment
    ? parseAmountCents(amountUnits, { allowZero: true, allowNegative: !isCard })
    : parseAmountCents(amountUnits);

  const categoriesForType = React.useMemo(() => {
    if (isIncome || isExpense) {
      return [...categories]
        .filter((c) => c.kind === type)
        .sort((a, b) => {
          const usage = (b.usageCount ?? 0) - (a.usageCount ?? 0);
          return usage !== 0 ? usage : a.name.localeCompare(b.name, "es");
        });
    }
    return [];
  }, [categories, isExpense, isIncome, type]);

  const adjustmentPreview = React.useMemo(
    () =>
      isAdjustment && selectedAccount
        ? buildAdjustmentPreview({
            accountType: selectedAccount.type,
            currentBalanceCents: selectedAccount.currentBalanceCents,
            targetBalanceCents: amountCents,
            currency,
          })
        : null,
    [isAdjustment, selectedAccount, amountCents, currency],
  );

  const showGroupSplit = isExpense;
  const activeGroupSplit = showGroupSplit && groupSplitEnabled;

  const splitPreview = React.useMemo(() => {
    if (!activeGroupSplit || amountCents === null || amountCents <= 0) {
      return { result: null, error: null as string | null };
    }
    try {
      const result = computeGroupSplit({
        totalCents: amountCents,
        mode: groupSplitMode,
        members: members.map((m) => ({
          name: m.name,
          amountCents:
            groupSplitMode === "custom"
              ? (parseAmountCents(m.amountUnits, { allowZero: true }) ?? 0)
              : undefined,
        })),
      });
      return { result, error: null };
    } catch (err) {
      return {
        result: null,
        error:
          err instanceof Error ? err.message : "No pudimos dividir el gasto",
      };
    }
  }, [
    activeGroupSplit,
    amountCents,
    groupSplitMode,
    members,
  ]);

  const availableSuggestions = SUGGESTED_GROUP_MEMBERS.filter(
    (name) => !hasGroupMemberName(members.map((m) => m.name), name),
  );

  function changeType(next: CoreTransactionType) {
    setType(next);
    setError(null);
    setCategoryId("");
    if (next !== "expense") {
      setGroupSplitEnabled(false);
      setMembers([]);
      setMemberDraft("");
    }
  }

  function changeAccount(nextId: string) {
    setAccountId(nextId);
    if (nextId === counterpartyId) setCounterpartyId("");
  }

  function addMember(rawName: string) {
    const name = rawName.trim().replace(/\s+/g, " ");
    if (!name) return;
    if (hasGroupMemberName(members.map((m) => m.name), name)) {
      setMemberDraft("");
      return;
    }
    setMembers((prev) => [
      ...prev,
      { id: newMemberId(), name, amountUnits: "" },
    ]);
    setMemberDraft("");
  }

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  function updateMemberAmount(id: string, value: string) {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, amountUnits: value } : m)),
    );
  }

  async function handleSave() {
    setError(null);

    if (!selectedAccount) {
      setError("Elegí una cuenta");
      return;
    }

    if (amountCents === null || (!isAdjustment && amountCents <= 0)) {
      setError(isAdjustment ? "Ingresá el saldo real" : "Ingresá un monto válido");
      return;
    }

    if ((isIncome || isExpense) && !categoryId) {
      setError("Elegí una categoría");
      return;
    }

    if (isTransfer) {
      if (!counterpartyId) {
        setError("Elegí la cuenta de destino");
        return;
      }
      if (counterpartyId === accountId) {
        setError("El destino debe ser distinto al origen");
        return;
      }
    }

    let groupSplit: {
      method: GroupSplitMode;
      members: { name: string; amountCents?: number }[];
    } | null = null;

    if (activeGroupSplit) {
      if (members.length === 0) {
        setError("Agregá al menos una persona para dividir el gasto");
        return;
      }
      if (splitPreview.error) {
        setError(splitPreview.error);
        return;
      }
      groupSplit = {
        method: groupSplitMode,
        members: members.map((m) => ({
          name: m.name,
          amountCents:
            groupSplitMode === "custom"
              ? (parseAmountCents(m.amountUnits, { allowZero: true }) ?? 0)
              : undefined,
        })),
      };
    }

    const descriptionValue = description.trim() || null;
    setBusy(true);

    const result = isAdjustment
      ? await createCoreTransactionAction({
          type: "adjustment",
          workspaceId,
          accountId,
          targetBalanceCents: amountCents,
          occurredOn,
          description: descriptionValue,
          currency,
        })
      : await createCoreTransactionAction({
          type,
          workspaceId,
          accountId,
          counterpartyAccountId: isTransfer ? counterpartyId : null,
          categoryId: isTransfer ? null : categoryId,
          amountCents,
          occurredOn,
          description: descriptionValue,
          currency,
          frequency: isAdjustment ? "once" : frequency,
          groupSplit,
        });

    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSaved(true);
    window.setTimeout(() => {
      handleSaved();
    }, 1200);
  }

  const canSave =
    !blocked &&
    Boolean(selectedAccount) &&
    amountCents !== null &&
    (isAdjustment ? adjustmentPreview?.kind === "ready" : amountCents > 0) &&
    (!isTransfer || Boolean(counterpartyId));

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <TypeTabs value={type} onChange={changeType} disabled={blocked} />

      <AmountBlock
        theme={theme}
        currency={currency}
        value={amountUnits}
        inputRef={amountRef}
        disabled={blocked}
        allowNegative={isAdjustment && !isCard}
        label={isAdjustment ? adjustmentTargetLabel(selectedAccount?.type) : "Monto"}
        onChange={setAmountUnits}
        hint={
          isAdjustment && selectedAccount
            ? `Hoy: ${formatAdjustmentCurrent(
                selectedAccount.type,
                selectedAccount.currentBalanceCents,
                currency,
              )}`
            : isTransfer
              ? "Lo que sale de la cuenta origen"
              : undefined
        }
      />

      {isAdjustment && adjustmentPreview?.text ? (
        <p
          className={cn(
            "rounded-xl px-3 py-2.5 text-sm text-pretty",
            adjustmentPreview.kind === "ready"
              ? "bg-muted/60 text-foreground"
              : "bg-muted/60 text-muted-foreground",
          )}
        >
          {adjustmentPreview.text}
        </p>
      ) : null}

      {isTransfer ? (
        <TransferAccounts
          accounts={accounts}
          originId={accountId}
          destinationId={counterpartyId}
          disabled={blocked}
          onOriginChange={changeAccount}
          onDestinationChange={setCounterpartyId}
        />
      ) : (
        <AccountSection
          label={isIncome ? "Se acredita en" : "Se descuenta de"}
          theme={theme}
          accounts={accounts}
          selectedId={accountId}
          disabled={blocked}
          onSelect={changeAccount}
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Fecha">
          <DateField
            id="core-occurred-on"
            value={occurredOn}
            onChange={setOccurredOn}
            disabled={blocked}
          />
        </Field>
        <Field label="Nota" optional>
          <Input
            id="core-description"
            value={description}
            maxLength={80}
            placeholder="¿Para qué fue esto?"
            disabled={blocked}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
      </div>

      {isIncome || isExpense ? (
        <CategorySection
          kind={type}
          theme={theme}
          categories={categoriesForType}
          selectedId={categoryId}
          disabled={blocked}
          onSelect={setCategoryId}
        />
      ) : null}

      {!isAdjustment ? (
        <FrequencySection
          value={frequency}
          disabled={blocked}
          onChange={setFrequency}
        />
      ) : null}

      {showGroupSplit ? (
        <GroupSplitSection
          theme={theme}
          enabled={groupSplitEnabled}
          onEnabledChange={setGroupSplitEnabled}
          mode={groupSplitMode}
          onModeChange={setGroupSplitMode}
          members={members}
          memberDraft={memberDraft}
          onMemberDraftChange={setMemberDraft}
          onAddMember={addMember}
          onRemoveMember={removeMember}
          onMemberAmountChange={updateMemberAmount}
          suggestions={availableSuggestions}
          preview={splitPreview.result}
          previewError={splitPreview.error}
          currency={currency}
          disabled={blocked}
        />
      ) : null}

      {amountCents !== null && amountCents > 0 ? (
        <SummaryChip
          theme={theme}
          currency={currency}
          amountCents={amountCents}
          suffix={
            activeGroupSplit && splitPreview.result
              ? ` · ${members.length + 1} personas`
              : null
          }
        />
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive text-pretty"
        >
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-1 flex items-center gap-2 bg-background/80 px-1 pt-2 pb-1 backdrop-blur-sm">
        <Button
          type="button"
          variant="outline"
          className="h-12"
          disabled={blocked}
          onClick={handleCancel}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          className="h-12 flex-1 gap-2 text-base font-bold"
          disabled={!canSave}
          onClick={handleSave}
        >
          {saved ? (
            <>
              <Check className="size-5" strokeWidth={2.25} />
              Guardado
            </>
          ) : busy ? (
            "Guardando..."
          ) : activeGroupSplit ? (
            "Registrar gasto grupal"
          ) : (
            "Registrar movimiento"
          )}
        </Button>
      </div>
    </div>
  );
}

function TypeTabs({
  value,
  onChange,
  disabled,
}: {
  value: CoreTransactionType;
  onChange: (next: CoreTransactionType) => void;
  disabled: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label="Tipo de movimiento"
      className="grid grid-cols-4 gap-1.5"
    >
      {CORE_TYPE_ORDER.map((item) => {
        const theme = CORE_TYPE_THEME[item];
        const active = item === value;
        const Icon = theme.icon;
        return (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(item)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2.5 text-xs font-semibold transition-colors",
              "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              active
                ? theme.tabActive
                : "border-border bg-card text-muted-foreground hover:text-foreground",
              disabled && "opacity-60",
            )}
          >
            <Icon className="size-4" strokeWidth={2} aria-hidden />
            <span className="truncate">{theme.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function AmountBlock({
  theme,
  currency,
  value,
  label,
  hint,
  disabled,
  allowNegative,
  inputRef,
  onChange,
}: {
  theme: (typeof CORE_TYPE_THEME)[CoreTransactionType];
  currency: string;
  value: string;
  label: string;
  hint?: string;
  disabled: boolean;
  allowNegative: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs font-medium text-muted-foreground">
          {currency}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn("text-4xl font-bold tabular-nums", theme.text)}
          aria-hidden
        >
          {theme.sign}
        </span>
        <AmountInput
          ref={inputRef}
          value={value}
          disabled={disabled}
          allowNegative={allowNegative}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
          className="h-16 flex-1 border-0 bg-transparent px-0 text-4xl font-bold tabular-nums shadow-none focus-visible:ring-0 dark:bg-transparent"
          placeholder="0,00"
        />
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
        {optional ? <span className="text-muted-foreground/70"> (opcional)</span> : null}
      </span>
      {children}
    </div>
  );
}

function SectionHeading({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}

function AccountCard({
  account,
  selected,
  disabled,
  theme,
  onSelect,
}: {
  account: CoreAccountOption;
  selected: boolean;
  disabled: boolean;
  theme: (typeof CORE_TYPE_THEME)[CoreTransactionType];
  onSelect: () => void;
}) {
  const emoji = ACCOUNT_TYPE_EMOJI[account.type];
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-40 shrink-0 snap-start flex-col gap-2 rounded-xl border bg-card p-3 text-left transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        selected
          ? cn(theme.border, theme.soft)
          : "border-border hover:border-ring/40",
        disabled && "opacity-60",
      )}
    >
      <span className="flex items-center gap-2">
        <span className="text-lg" aria-hidden>
          {emoji}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {account.name}
        </span>
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">
        {formatMoney(account.currentBalanceCents, account.currency)}
      </span>
    </button>
  );
}

function AccountSection({
  label,
  theme,
  accounts,
  selectedId,
  disabled,
  onSelect,
}: {
  label: string;
  theme: (typeof CORE_TYPE_THEME)[CoreTransactionType];
  accounts: readonly CoreAccountOption[];
  selectedId: string;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <SectionHeading title={label} />
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            theme={theme}
            selected={account.id === selectedId}
            disabled={disabled}
            onSelect={() => onSelect(account.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TransferAccounts({
  accounts,
  originId,
  destinationId,
  disabled,
  onOriginChange,
  onDestinationChange,
}: {
  accounts: readonly CoreAccountOption[];
  originId: string;
  destinationId: string;
  disabled: boolean;
  onOriginChange: (id: string) => void;
  onDestinationChange: (id: string) => void;
}) {
  const theme = CORE_TYPE_THEME.transfer;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <SectionHeading title="Desde" />
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              theme={theme}
              selected={account.id === originId}
              disabled={disabled}
              onSelect={() => onOriginChange(account.id)}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <SectionHeading title="Hacia" />
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {accounts
            .filter((account) => account.id !== originId)
            .map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                theme={theme}
                selected={account.id === destinationId}
                disabled={disabled}
                onSelect={() => onDestinationChange(account.id)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

function CategorySection({
  kind,
  theme,
  categories,
  selectedId,
  disabled,
  onSelect,
}: {
  kind: "income" | "expense";
  theme: (typeof CORE_TYPE_THEME)[CoreTransactionType];
  categories: readonly CoreCategoryOption[];
  selectedId: string;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  const selected = categories.find((c) => c.id === selectedId);
  return (
    <div className="flex flex-col gap-2">
      <SectionHeading
        title="Categoría"
        hint={selected ? splitLeadingEmoji(selected.name).label : undefined}
      />
      {categories.length === 0 ? (
        <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
          Todavía no hay categorías de {kind === "income" ? "ingreso" : "gasto"}.
          Creá una en Ajustes.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {categories.map((category) => {
            const { emoji, label } = splitLeadingEmoji(category.name);
            const isSelected = category.id === selectedId;
            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={isSelected}
                disabled={disabled}
                onClick={() => onSelect(category.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2.5 transition-colors",
                  "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  isSelected
                    ? cn(theme.border, theme.soft)
                    : "border-border bg-card hover:border-ring/40",
                  disabled && "opacity-60",
                )}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {emoji ?? "🏷️"}
                </span>
                <span className="w-full truncate text-center text-[11px] font-medium text-foreground">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FrequencySection({
  value,
  disabled,
  onChange,
}: {
  value: TransactionFrequency;
  disabled: boolean;
  onChange: (next: TransactionFrequency) => void;
}) {
  const hint = frequencyHint(value);
  return (
    <div className="flex flex-col gap-2">
      <SectionHeading title="Frecuencia" />
      <div className="flex flex-wrap gap-1.5">
        {TRANSACTION_FREQUENCIES.map((item) => {
          const active = item === value;
          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onChange(item)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                active
                  ? "border-info bg-info-muted text-info-muted-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
                disabled && "opacity-60",
              )}
            >
              {TRANSACTION_FREQUENCY_LABELS[item]}
            </button>
          );
        })}
      </div>
      {hint ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Repeat className="size-3.5" aria-hidden />
          {hint}. Se crea una regla recurrente.
        </p>
      ) : null}
    </div>
  );
}

function GroupSplitSection({
  theme,
  enabled,
  onEnabledChange,
  mode,
  onModeChange,
  members,
  memberDraft,
  onMemberDraftChange,
  onAddMember,
  onRemoveMember,
  onMemberAmountChange,
  suggestions,
  preview,
  previewError,
  currency,
  disabled,
}: {
  theme: (typeof CORE_TYPE_THEME)[CoreTransactionType];
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  mode: GroupSplitMode;
  onModeChange: (next: GroupSplitMode) => void;
  members: readonly MemberDraft[];
  memberDraft: string;
  onMemberDraftChange: (value: string) => void;
  onAddMember: (name: string) => void;
  onRemoveMember: (id: string) => void;
  onMemberAmountChange: (id: string, value: string) => void;
  suggestions: readonly string[];
  preview: ReturnType<typeof computeGroupSplit> | null;
  previewError: string | null;
  currency: string;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
      <label className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users className="size-4" aria-hidden />
          Gasto grupal
        </span>
        <input
          type="checkbox"
          className="size-5 accent-[var(--expense)]"
          checked={enabled}
          disabled={disabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
      </label>

      {enabled ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-1.5">
            <ModeButton
              active={mode === "equal"}
              theme={theme}
              disabled={disabled}
              onClick={() => onModeChange("equal")}
            >
              Partes iguales
            </ModeButton>
            <ModeButton
              active={mode === "custom"}
              theme={theme}
              disabled={disabled}
              onClick={() => onModeChange("custom")}
            >
              Personalizado
            </ModeButton>
          </div>

          <ul className="flex flex-col gap-1.5">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center gap-2 rounded-lg bg-muted/50 px-2 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {member.name}
                </span>
                {mode === "custom" ? (
                  <AmountInput
                    value={member.amountUnits}
                    disabled={disabled}
                    aria-label={`Monto de ${member.name}`}
                    onChange={(event) =>
                      onMemberAmountChange(member.id, event.target.value)
                    }
                    className="h-8 w-28 text-right text-sm"
                  />
                ) : null}
                <button
                  type="button"
                  aria-label={`Quitar a ${member.name}`}
                  disabled={disabled}
                  onClick={() => onRemoveMember(member.id)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <Input
              value={memberDraft}
              disabled={disabled}
              maxLength={40}
              placeholder="Agregar persona"
              aria-label="Nombre de la persona"
              onChange={(event) => onMemberDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAddMember(memberDraft);
                }
              }}
              className="h-9 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              disabled={disabled || memberDraft.trim().length === 0}
              aria-label="Agregar persona"
              onClick={() => onAddMember(memberDraft)}
            >
              <Plus className="size-4" aria-hidden />
            </Button>
          </div>

          {suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  disabled={disabled}
                  onClick={() => onAddMember(name)}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  + {name}
                </button>
              ))}
            </div>
          ) : null}

          {previewError ? (
            <p className="text-xs text-destructive text-pretty">{previewError}</p>
          ) : preview ? (
            <div className="flex flex-col gap-1 rounded-lg bg-muted/50 px-3 py-2 text-xs">
              <div className="flex items-center justify-between text-foreground">
                <span className="font-medium">Vos</span>
                <span className="tabular-nums">
                  {formatMoney(preview.userShareCents, currency)}
                </span>
              </div>
              {preview.members.map((member, index) => (
                <div
                  key={`${member.name}-${index}`}
                  className="flex items-center justify-between text-muted-foreground"
                >
                  <span className="truncate">{member.name}</span>
                  <span className="tabular-nums">
                    {formatMoney(member.amountCents, currency)}
                  </span>
                </div>
              ))}
              {preview.unassignedCents > 0 ? (
                <p className="pt-0.5 text-warning">
                  Sin asignar: {formatMoney(preview.unassignedCents, currency)}
                </p>
              ) : null}
              {preview.hasExcess ? (
                <p className="pt-0.5 text-expense">
                  Se pasa por {formatMoney(preview.exceededCents, currency)}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ModeButton({
  active,
  theme,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  theme: (typeof CORE_TYPE_THEME)[CoreTransactionType];
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        active
          ? cn(theme.border, theme.soft, "text-foreground")
          : "border-border bg-background text-muted-foreground hover:text-foreground",
        disabled && "opacity-60",
      )}
    >
      {children}
    </button>
  );
}

function SummaryChip({
  theme,
  currency,
  amountCents,
  suffix,
}: {
  theme: (typeof CORE_TYPE_THEME)[CoreTransactionType];
  currency: string;
  amountCents: number;
  suffix?: string | null;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm",
        theme.soft,
      )}
    >
      <span className="flex items-center gap-2 font-medium text-foreground">
        <Wallet className="size-4" aria-hidden />
        {theme.label}
        {suffix ? (
          <span className="text-muted-foreground">{suffix}</span>
        ) : null}
      </span>
      <span className={cn("font-bold tabular-nums", theme.text)}>
        {theme.sign} {formatMoney(amountCents, currency)}
      </span>
    </div>
  );
}
