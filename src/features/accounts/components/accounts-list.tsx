"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { UsageTip } from "@/components/usage-tip";
import { FormSheet } from "@/components/form-sheet";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
          <AccountTable
            accounts={group.accounts}
            canMutate={canMutate}
            isUnarchiving={isUnarchiving}
            onPay={openPay}
            onEdit={setEditTarget}
            onArchive={setArchiveTarget}
            onDelete={setDeleteTarget}
            onUnarchive={unarchive}
          />
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

type AccountTableProps = {
  accounts: readonly AccountsListItem[];
  canMutate: boolean;
  isUnarchiving: boolean;
  onPay: (accountId: string) => void;
  onEdit: (account: AccountActionTarget) => void;
  onArchive: (account: AccountActionTarget) => void;
  onDelete: (account: AccountActionTarget) => void;
  onUnarchive: (accountId: string) => void;
};

function AccountTable({
  accounts,
  canMutate,
  isUnarchiving,
  onPay,
  onEdit,
  onArchive,
  onDelete,
  onUnarchive,
}: AccountTableProps) {
  return (
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
        {accounts.map((account) => {
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
            <TableRow
              key={account.id}
              className={
                account.isArchived
                  ? "bg-muted/20 text-muted-foreground"
                  : undefined
              }
            >
              <TableCell>
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span
                      className={
                        account.isArchived
                          ? "font-medium text-muted-foreground"
                          : "font-medium text-foreground"
                      }
                    >
                      {account.name}
                    </span>
                    {account.isArchived ? (
                      <Badge variant="warning" className="font-normal">
                        Archivada
                      </Badge>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted-foreground sm:hidden">
                    {ACCOUNT_TYPE_LABEL_ES[account.type]}
                    {isCreditDebt ? " · Deuda" : ""}
                  </span>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className={
                      account.isArchived ? "opacity-70" : undefined
                    }
                  >
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
                  account.isArchived
                    ? "text-muted-foreground"
                    : isNegative || isCreditDebt
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
                  <div className="flex items-center justify-end gap-1">
                    {showPay ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 sm:h-8"
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
                          size="sm"
                          className="h-10 w-10 sm:h-8 sm:w-8"
                          aria-label={`Acciones de ${account.name}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44">
                        {!account.isArchived ? (
                          <>
                            <DropdownMenuItem
                              onSelect={() => onEdit(target)}
                            >
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => onArchive(target)}
                            >
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
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
