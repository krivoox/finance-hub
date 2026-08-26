"use client";

import type { AccountType } from "@/features/accounts/domain";
import type { GoalKind } from "@/features/goals/domain";
import { ACCOUNT_TYPE_LABEL_ES } from "@/features/accounts/components/account-type-labels";
import { cn } from "@/lib/utils";

export type GoalAccountOption = {
  id: string;
  name: string;
  currency: string;
  type: AccountType;
};

const SAVE_ORDER: readonly AccountType[] = [
  "savings",
  "cash",
  "virtual_wallet",
  "checking",
  "other",
  "credit_card",
];

const DEBT_ORDER: readonly AccountType[] = [
  "credit_card",
  "checking",
  "savings",
  "virtual_wallet",
  "cash",
  "other",
];

function rankForKind(type: AccountType, kind: GoalKind | undefined): number {
  const order = kind === "debt_payoff" ? DEBT_ORDER : SAVE_ORDER;
  const index = order.indexOf(type);
  return index === -1 ? order.length : index;
}

export function sortAccountsForGoalKind(
  accounts: readonly GoalAccountOption[],
  kind: GoalKind | undefined,
): GoalAccountOption[] {
  return accounts.toSorted(
    (a, b) =>
      rankForKind(a.type, kind) - rankForKind(b.type, kind) ||
      a.name.localeCompare(b.name, "es"),
  );
}

type AccountChoiceListProps = {
  id: string;
  accounts: readonly GoalAccountOption[];
  value: string;
  onChange: (accountId: string) => void;
  disabled?: boolean;
  /** Empty string option — e.g. "Sin vincular". Omit to require a choice. */
  noneLabel?: string;
  emptyLabel: string;
  kind?: GoalKind;
};

/**
 * In-sheet account picker. Rows are the control (type + currency stay visible).
 * Do not use a native `<select>` — OS picker + Dialog pointer-events / overflow.
 */
export function AccountChoiceList({
  id,
  accounts,
  value,
  onChange,
  disabled,
  noneLabel,
  emptyLabel,
  kind,
}: AccountChoiceListProps) {
  const sorted = sortAccountsForGoalKind(accounts, kind);
  const hasNone = noneLabel != null;
  const isEmpty = sorted.length === 0 && !hasNone;

  if (isEmpty) {
    return (
      <p
        id={id}
        className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground text-pretty"
      >
        {emptyLabel}
      </p>
    );
  }

  return (
    <div
      id={id}
      role="radiogroup"
      className="flex flex-col gap-1.5"
    >
      {hasNone ? (
        <AccountChoiceRow
          selected={value === ""}
          disabled={disabled}
          title={noneLabel}
          onSelect={() => onChange("")}
        />
      ) : null}
      {sorted.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground text-pretty">
          {emptyLabel}
        </p>
      ) : null}
      {sorted.map((account) => (
        <AccountChoiceRow
          key={account.id}
          selected={value === account.id}
          disabled={disabled}
          title={account.name}
          subtitle={`${ACCOUNT_TYPE_LABEL_ES[account.type]} · ${account.currency}`}
          onSelect={() => onChange(account.id)}
        />
      ))}
    </div>
  );
}

function AccountChoiceRow({
  selected,
  disabled,
  title,
  subtitle,
  onSelect,
}: {
  selected: boolean;
  disabled?: boolean;
  title: string;
  subtitle?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex min-h-11 w-full flex-col items-start justify-center rounded-lg border px-3 py-2 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        selected
          ? "border-info bg-info-muted text-foreground"
          : "border-input bg-transparent text-foreground hover:border-ring/40",
      )}
    >
      <span className="text-sm font-medium">{title}</span>
      {subtitle ? (
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      ) : null}
    </button>
  );
}
