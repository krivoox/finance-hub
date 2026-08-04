"use client";

import { useMemo, useState } from "react";

import { UsageTip } from "@/components/usage-tip";
import { FormSheet } from "@/components/form-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ACCOUNT_TYPE_LABEL_ES } from "@/features/accounts/components/account-type-labels";
import {
  PayCreditCardForm,
  type PayCreditCardAccountOption,
} from "@/features/accounts/components/pay-credit-card-form";
import type { AccountType } from "@/features/accounts/domain";
import { TIP_IDS } from "@/lib/tips-storage";
import { formatMoney } from "@/lib/format-money";

export type AccountsListItem = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balanceCents: number;
};

type AccountsListProps = {
  workspaceId: string;
  canMutate: boolean;
  accounts: readonly AccountsListItem[];
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
    .map(([currency, items]) => ({ currency, accounts: items }));
}

export function AccountsList({
  workspaceId,
  canMutate,
  accounts,
}: AccountsListProps) {
  const [payTargetId, setPayTargetId] = useState<string | null>(null);

  const groups = useMemo(() => groupByCurrency(accounts), [accounts]);

  const cardsWithDebt = useMemo(
    () =>
      accounts.filter(
        (a) => a.type === "credit_card" && a.balanceCents > 0,
      ),
    [accounts],
  );

  const payTarget = useMemo(
    () => accounts.find((a) => a.id === payTargetId) ?? null,
    [accounts, payTargetId],
  );

  const sourceOptions: PayCreditCardAccountOption[] = useMemo(
    () =>
      accounts.map((a) => ({
        id: a.id,
        name: a.name,
        currency: a.currency,
        type: a.type,
      })),
    [accounts],
  );

  const showTip = cardsWithDebt.length > 0;
  const firstDebtCard = cardsWithDebt[0] ?? null;

  function openPay(accountId: string) {
    setPayTargetId(accountId);
  }

  function closePay() {
    setPayTargetId(null);
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
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
        <section key={group.currency} aria-label={`Cuentas ${group.currency}`}>
          <div className="mb-3 flex items-center gap-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {group.currency === "USD"
                ? "Dólares"
                : group.currency === "ARS"
                  ? "Pesos"
                  : group.currency}
            </p>
            <Badge
              variant={group.currency === "USD" ? "info" : "outline"}
              className="h-5 px-1.5 text-xs"
            >
              {group.currency}
            </Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuenta</TableHead>
                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                {canMutate ? (
                  <TableHead className="w-[1%] text-right">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.accounts.map((account) => {
                const isCreditDebt =
                  account.type === "credit_card" && account.balanceCents > 0;
                const isNegative = account.balanceCents < 0;
                const showPay = canMutate && isCreditDebt;

                return (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-medium text-foreground">
                          {account.name}
                        </span>
                        <span className="text-xs text-muted-foreground sm:hidden">
                          {ACCOUNT_TYPE_LABEL_ES[account.type]}
                          {isCreditDebt ? " · Deuda" : ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary">
                          {ACCOUNT_TYPE_LABEL_ES[account.type]}
                        </Badge>
                        {isCreditDebt ? (
                          <Badge variant="expense" className="font-normal">
                            Deuda
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium tabular-nums ${
                        isNegative || isCreditDebt
                          ? "text-expense"
                          : "text-foreground"
                      }`}
                    >
                      {isCreditDebt
                        ? `− ${formatMoney(account.balanceCents, account.currency)}`
                        : formatMoney(account.balanceCents, account.currency)}
                    </TableCell>
                    {canMutate ? (
                      <TableCell className="text-right">
                        {showPay ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-10 sm:h-8"
                            onClick={() => openPay(account.id)}
                          >
                            Pagar
                          </Button>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
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
    </div>
  );
}
