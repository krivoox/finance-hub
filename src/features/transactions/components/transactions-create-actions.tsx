"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Plus } from "lucide-react";

import { FormSheet } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { NewCurrencyExchangeForm } from "@/features/currency-exchange/components/new-currency-exchange-form";
import { replaceAndRefresh } from "@/lib/navigation";

import { useNewTransactionSheetStore } from "../stores/new-transaction-sheet-store";

type AccountOption = {
  id: string;
  name: string;
  currency: string;
};

type TransactionsCreateActionsProps = {
  workspaceId: string;
  accounts: readonly AccountOption[];
};

function clearCreateQuery(
  pathname: string,
  searchParams: URLSearchParams,
  router: ReturnType<typeof useRouter>,
  opts?: { refresh?: boolean },
) {
  if (!searchParams.has("new")) return;
  const next = new URLSearchParams(searchParams.toString());
  next.delete("new");
  const qs = next.toString();
  const href = qs ? `${pathname}?${qs}` : pathname;
  if (opts?.refresh) {
    replaceAndRefresh(router, href, { scroll: false });
  } else {
    router.replace(href, { scroll: false });
  }
}

/**
 * Page-local create CTAs for FX. “Nueva transacción” opens the global
 * new-transaction sheet (mounted in AppShell).
 */
export function TransactionsCreateActions({
  workspaceId,
  accounts,
}: TransactionsCreateActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const newParam = searchParams.get("new");
  const openNewTransaction = useNewTransactionSheetStore((s) => s.openSheet);

  const [fxOpen, setFxOpen] = useState(false);

  useEffect(() => {
    if (newParam === "fx" || newParam === "exchange") {
      setFxOpen(true);
    }
  }, [newParam]);

  function handleFxOpenChange(open: boolean, opts?: { refresh?: boolean }) {
    setFxOpen(open);
    if (!open) clearCreateQuery(pathname, searchParams, router, opts);
  }

  const canFx = accounts.length >= 2;

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <Button
        type="button"
        className="w-full gap-1.5 sm:w-auto"
        onClick={() => openNewTransaction()}
      >
        <Plus className="size-4" strokeWidth={1.75} />
        Nueva transacción
      </Button>

      {canFx ? (
        <FormSheet
          open={fxOpen}
          onOpenChange={handleFxOpenChange}
          title="Cambio de moneda"
          description="Canjeá entre cuentas ARS y USD del mismo workspace."
          size="md"
          trigger={
            <Button variant="outline" className="w-full gap-1.5 sm:w-auto">
              <ArrowUpDown className="size-4" strokeWidth={1.75} />
              Cambio
            </Button>
          }
        >
          <NewCurrencyExchangeForm
            workspaceId={workspaceId}
            accounts={accounts.map((a) => ({
              id: a.id,
              name: a.name,
              currency: a.currency,
            }))}
            onSuccess={() => handleFxOpenChange(false, { refresh: true })}
            onCancel={() => handleFxOpenChange(false)}
          />
        </FormSheet>
      ) : null}
    </div>
  );
}
