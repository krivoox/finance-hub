"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, Plus } from "lucide-react";

import { FormSheet } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";

import {
  ContributeCrossWorkspaceForm,
  type ContributionAccountOption,
} from "./contribute-cross-workspace-form";
import { NewTransactionForm } from "./new-transaction-form";

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

type TransactionsCreateActionsProps = {
  workspaceId: string;
  workspaceName: string;
  workspaceCurrency: string;
  accounts: readonly AccountOption[];
  paymentAccountGroups?: readonly PaymentAccountGroup[];
  categories: readonly CategoryOption[];
  groupMembers?: readonly MemberOption[];
  currentUserId?: string;
  contributionAccounts?: readonly ContributionAccountOption[];
};

function clearCreateQuery(
  pathname: string,
  searchParams: URLSearchParams,
  router: ReturnType<typeof useRouter>,
) {
  if (!searchParams.has("new")) return;
  const next = new URLSearchParams(searchParams.toString());
  next.delete("new");
  const qs = next.toString();
  router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
}

export function TransactionsCreateActions({
  workspaceId,
  workspaceName,
  workspaceCurrency,
  accounts,
  paymentAccountGroups = [],
  categories,
  groupMembers = [],
  currentUserId,
  contributionAccounts = [],
}: TransactionsCreateActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const newParam = searchParams.get("new");

  const [txOpen, setTxOpen] = useState(false);
  const [crossOpen, setCrossOpen] = useState(false);

  useEffect(() => {
    if (newParam === "1" || newParam === "transaction") {
      setTxOpen(true);
    }
    if (newParam === "cross") {
      setCrossOpen(true);
    }
  }, [newParam]);

  function handleTxOpenChange(open: boolean) {
    setTxOpen(open);
    if (!open) clearCreateQuery(pathname, searchParams, router);
  }

  function handleCrossOpenChange(open: boolean) {
    setCrossOpen(open);
    if (!open) clearCreateQuery(pathname, searchParams, router);
  }

  const hasAccounts = accounts.length > 0;
  const canCross = contributionAccounts.length >= 2;

  return (
    <>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <FormSheet
          open={txOpen}
          onOpenChange={handleTxOpenChange}
          title="Nuevo movimiento"
          description={`Gasto, ingreso o transferencia en ${workspaceCurrency}.`}
          size="lg"
          trigger={
            <Button className="h-10 w-full gap-1.5 sm:h-8 sm:w-auto" disabled={!hasAccounts}>
              <Plus className="size-4" strokeWidth={1.75} />
              Registrar
            </Button>
          }
        >
          {hasAccounts ? (
            <NewTransactionForm
              workspaceId={workspaceId}
              workspaceName={workspaceName}
              workspaceCurrency={workspaceCurrency}
              accounts={accounts}
              paymentAccountGroups={paymentAccountGroups}
              categories={categories}
              groupMembers={groupMembers}
              currentUserId={currentUserId}
              onSuccess={() => handleTxOpenChange(false)}
              onCancel={() => handleTxOpenChange(false)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Necesitás al menos una cuenta activa para registrar movimientos.
            </p>
          )}
        </FormSheet>

        {canCross ? (
          <FormSheet
            open={crossOpen}
            onOpenChange={handleCrossOpenChange}
            title="Aportar a otro espacio"
            description="Mové fondos entre tus workspaces."
            size="md"
            trigger={
              <Button
                variant="outline"
                className="h-10 w-full gap-1.5 sm:h-8 sm:w-auto"
              >
                <ArrowLeftRight className="size-4" strokeWidth={1.75} />
                Entre espacios
              </Button>
            }
          >
            <ContributeCrossWorkspaceForm
              accounts={contributionAccounts}
              currencyHint={workspaceCurrency}
              onSuccess={() => handleCrossOpenChange(false)}
              onCancel={() => handleCrossOpenChange(false)}
            />
          </FormSheet>
        ) : null}
      </div>
    </>
  );
}
