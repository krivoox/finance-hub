"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CreditCard,
  Landmark,
  MoreHorizontal,
  PiggyBank,
  Wallet,
  WalletMinimal,
} from "lucide-react";
import { toast } from "sonner";

import { UsageTip } from "@/components/usage-tip";
import { FormSheet } from "@/components/form-sheet";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArchiveAccountDialog,
  DeleteAccountDialog,
} from "@/features/accounts/components/account-lifecycle-dialogs";
import { ACCOUNT_TYPE_LABEL_ES } from "@/features/accounts/components/account-type-labels";
import { EditAccountForm } from "@/features/accounts/components/edit-account-form";
import {
  PayCreditCardForm,
  type PayCreditCardAccountOption,
} from "@/features/accounts/components/pay-credit-card-form";
import { unarchiveAccountAction } from "@/features/accounts/actions";
import type { AccountType } from "@/features/accounts/domain";
import { TIP_IDS } from "@/lib/tips-storage";
import { formatMoney } from "@/lib/format-money";
import { refreshAfterMutation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export type AccountsListItem = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balanceCents: number;
  creditLimitCents: number | null;
  isArchived: boolean;
};

type AccountsListProps = {
  workspaceId: string;
  canMutate: boolean;
  accounts: readonly AccountsListItem[];
};

const ACCOUNT_ICON: Record<AccountType, typeof Wallet> = {
  checking: Landmark,
  savings: PiggyBank,
  cash: Banknote,
  credit_card: CreditCard,
  virtual_wallet: WalletMinimal,
  other: Wallet,
};

function groupByCurrency(
  accounts: readonly AccountsListItem[],
): { currency: string; accounts: AccountsListItem[] }[] {
  const map = new Map<string, AccountsListItem[]>();
  for (const account of accounts) {
    const list = map.get(account.currency) ?? [];
    list.push(account);
    map.set(account.currency, list);
  }
  const order = (c: string) => (c === "ARS" ? 0 : c === "USD" ? 1 : 2);
  return [...map.entries()]
    .sort((a, b) => order(a[0]) - order(b[0]) || a[0].localeCompare(b[0]))
    .map(([currency, items]) => ({
      currency,
      // Activas arriba; archivadas al final del mismo listado.
      accounts: [
        ...items.filter((a) => !a.isArchived),
        ...items.filter((a) => a.isArchived),
      ],
    }));
}

function currencyGroupLabel(currency: string): string {
  if (currency === "USD") return "Dólares";
  if (currency === "ARS") return "Pesos";
  return currency;
}

type AccountActionTarget = {
  id: string;
  name: string;
  type: AccountType;
  creditLimitCents: number | null;
};

export function AccountsList({
  workspaceId,
  canMutate,
  accounts,
}: AccountsListProps) {
  const router = useRouter();
  const [payTargetId, setPayTargetId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<AccountActionTarget | null>(
    null,
  );
  const [archiveTarget, setArchiveTarget] =
    useState<AccountActionTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccountActionTarget | null>(
    null,
  );
  const [isUnarchiving, startUnarchive] = useTransition();

  /** Active accounts only — pay sources / debt tips ignore archived. */
  const activeAccounts = useMemo(
    () => accounts.filter((a) => !a.isArchived),
    [accounts],
  );

  const groups = useMemo(() => groupByCurrency(accounts), [accounts]);

  const cardsWithDebt = useMemo(
    () =>
      activeAccounts.filter(
        (a) => a.type === "credit_card" && a.balanceCents > 0,
      ),
    [activeAccounts],
  );

  const payTarget = useMemo(
    () => accounts.find((a) => a.id === payTargetId) ?? null,
    [accounts, payTargetId],
  );

  const sourceOptions: PayCreditCardAccountOption[] = useMemo(
    () =>
      activeAccounts.map((a) => ({
        id: a.id,
        name: a.name,
        currency: a.currency,
        type: a.type,
      })),
    [activeAccounts],
  );

  const showTip = cardsWithDebt.length > 0;
  const firstDebtCard = cardsWithDebt[0] ?? null;

  function openPay(accountId: string) {
    setPayTargetId(accountId);
  }

  function closePay() {
    setPayTargetId(null);
  }

  function unarchive(accountId: string) {
    startUnarchive(async () => {
      const result = await unarchiveAccountAction({ accountId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cuenta desarchivada");
      refreshAfterMutation(router);
    });
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {showTip ? (
        <UsageTip
          tipId={TIP_IDS.creditCardPay}
          title="Esta tarjeta tiene deuda"
          body="Los gastos acá suman deuda. Para saldarla, transferí desde otra cuenta — o usá Pagar."
          actionLabel={canMutate && firstDebtCard ? "Pagar ahora" : undefined}
          onAction={
            canMutate && firstDebtCard
              ? () => openPay(firstDebtCard.id)
              : undefined
          }
        />
      ) : null}

      {groups.map((group) => (
        <SurfaceSection
          key={group.currency}
          aria-label={`Cuentas ${group.currency}`}
        >
          <SurfaceHeader
            title={currencyGroupLabel(group.currency)}
            action={
              <Badge
                variant={group.currency === "USD" ? "info" : "outline"}
                className="h-5 px-1.5 text-xs"
              >
                {group.currency}
              </Badge>
            }
          />
          <AccountGroupList
            accounts={group.accounts}
            canMutate={canMutate}
            isUnarchiving={isUnarchiving}
            onPay={openPay}
            onEdit={setEditTarget}
            onArchive={setArchiveTarget}
            onDelete={setDeleteTarget}
            onUnarchive={unarchive}
          />
        </SurfaceSection>
      ))}

      <FormSheet
        open={payTarget != null}
        onOpenChange={(open) => {
          if (!open) closePay();
        }}
        title="Pagar tarjeta"
        description={
          payTarget
            ? `Mové plata desde otra cuenta para bajar la deuda de ${payTarget.name}.`
            : "Mové plata desde otra cuenta para bajar la deuda."
        }
        size="md"
      >
        {payTarget ? (
          <PayCreditCardForm
            key={payTarget.id}
            workspaceId={workspaceId}
            creditCard={{
              id: payTarget.id,
              name: payTarget.name,
              currency: payTarget.currency,
              debtCents: payTarget.balanceCents,
            }}
            sourceAccounts={sourceOptions}
            onSuccess={closePay}
            onCancel={closePay}
          />
        ) : null}
      </FormSheet>

      <FormSheet
        open={editTarget != null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        title="Editar cuenta"
        description="Cambiá el nombre. En tarjetas también podés ajustar el límite."
        size="md"
      >
        {editTarget ? (
          <EditAccountForm
            key={editTarget.id}
            account={editTarget}
            onSuccess={() => setEditTarget(null)}
            onCancel={() => setEditTarget(null)}
          />
        ) : null}
      </FormSheet>

      {archiveTarget ? (
        <ArchiveAccountDialog
          open
          onOpenChange={(open) => {
            if (!open) setArchiveTarget(null);
          }}
          accountId={archiveTarget.id}
          accountName={archiveTarget.name}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteAccountDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          accountId={deleteTarget.id}
          accountName={deleteTarget.name}
        />
      ) : null}
    </div>
  );
}

type AccountGroupListProps = {
  accounts: readonly AccountsListItem[];
  canMutate: boolean;
  isUnarchiving: boolean;
  onPay: (accountId: string) => void;
  onEdit: (account: AccountActionTarget) => void;
  onArchive: (account: AccountActionTarget) => void;
  onDelete: (account: AccountActionTarget) => void;
  onUnarchive: (accountId: string) => void;
};

function AccountGroupList({
  accounts,
  canMutate,
  isUnarchiving,
  onPay,
  onEdit,
  onArchive,
  onDelete,
  onUnarchive,
}: AccountGroupListProps) {
  return (
    <ul className="-mx-2 divide-y divide-border">
      {accounts.map((account) => {
        const Icon = ACCOUNT_ICON[account.type];
        const isCreditDebt =
          !account.isArchived &&
          account.type === "credit_card" &&
          account.balanceCents > 0;
        const isNegative = account.balanceCents < 0;
        const showPay = canMutate && isCreditDebt;
        const target: AccountActionTarget = {
          id: account.id,
          name: account.name,
          type: account.type,
          creditLimitCents: account.creditLimitCents,
        };

        return (
          <li key={account.id} className="min-w-0">
            <div
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-xl px-2 py-2.5",
                account.isArchived && "opacity-70",
              )}
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                aria-hidden
              >
                <Icon className="size-4" strokeWidth={1.75} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      account.isArchived
                        ? "text-muted-foreground"
                        : "text-foreground",
                    )}
                  >
                    {account.name}
                  </p>
                  {account.isArchived ? (
                    <Badge variant="warning" className="font-normal">
                      Archivada
                    </Badge>
                  ) : null}
                  {isCreditDebt ? (
                    <Badge variant="expense" className="font-normal">
                      Deuda
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {ACCOUNT_TYPE_LABEL_ES[account.type]}
                </p>
              </div>

              <p
                className={cn(
                  "min-w-0 max-w-[42%] shrink-0 truncate text-right text-xs tabular sm:text-sm",
                  account.isArchived
                    ? "text-muted-foreground"
                    : isNegative || isCreditDebt
                      ? "text-expense"
                      : "text-foreground",
                )}
              >
                {isCreditDebt
                  ? `− ${formatMoney(account.balanceCents, account.currency)}`
                  : formatMoney(account.balanceCents, account.currency)}
              </p>

              {canMutate ? (
                <div className="flex shrink-0 items-center gap-1">
                  {showPay ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="hidden sm:inline-flex"
                      onClick={() => onPay(account.id)}
                    >
                      Pagar
                    </Button>
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Acciones de ${account.name}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-44">
                      {!account.isArchived ? (
                        <>
                          {showPay ? (
                            <DropdownMenuItem
                              className="sm:hidden"
                              onSelect={() => onPay(account.id)}
                            >
                              Pagar
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem onSelect={() => onEdit(target)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onArchive(target)}>
                            Archivar
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem
                          disabled={isUnarchiving}
                          onSelect={() => onUnarchive(account.id)}
                        >
                          Desarchivar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => onDelete(target)}
                      >
                        Eliminar permanentemente
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
