"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { FormSheet } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { NewCurrencyExchangeForm } from "@/features/currency-exchange/components/new-currency-exchange-form";
import { replaceAndRefresh } from "@/lib/navigation";

import { formOptionsIntentPrefetchHandlers } from "../stores/new-transaction-form-options-store";
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
 * Header CTA for new ledger entries. “Nueva transacción” opens the global
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
    <>
      <Button
        type="button"
        className="w-full gap-1.5 sm:w-auto"
        onClick={() => openNewTransaction()}
        {...formOptionsIntentPrefetchHandlers()}
      >
        <Plus className="size-4" strokeWidth={1.75} />
        Nueva transacción
      </Button>

      {/*
        TODO(fx-create-entry): el trigger “Cambio” (SheetTrigger outline +
        ArrowUpDown) se quitó del header de Transacciones. Cuando se retire
        el flujo de crear cambio de moneda, borrar también:
        - Este FormSheet + estado `fxOpen` / `?new=fx|exchange` en este archivo
        - `NewCurrencyExchangeForm`
          (`src/features/currency-exchange/components/new-currency-exchange-form.tsx`)
        - `createCurrencyExchangeAction` / `deleteCurrencyExchangeAction`
          (`src/features/currency-exchange/actions/create-currency-exchange.ts`
          y re-export en `actions/index.ts`)
        - `createCurrencyExchange` / `deleteCurrencyExchange`
          (`src/features/currency-exchange/services/create-currency-exchange.ts`
          y re-export en `services/index.ts`)
        - `createCurrencyExchangeSchema` / `deleteCurrencyExchangeSchema`
          (`src/features/currency-exchange/schemas/index.ts`)
        - Dominio de create: `assertValidCurrencyExchange`, errores de exchange
          (`src/features/currency-exchange/domain/{guards,errors}.ts`
          + `guards.test.ts`)
        - Comentario `fx`/`exchange`/`cross` en
          `src/features/transactions/lib/list-search-params.ts`
        No tocar cotización del sidebar (`consolidation-rate*`, “Convertir”).
        Labels de ledger (`fx_debit` / `fx_credit`) quedan hasta que se decida
        el destino de los movimientos ya registrados.
      */}
      {canFx ? (
        <FormSheet
          open={fxOpen}
          onOpenChange={handleFxOpenChange}
          title="Cambio de moneda"
          description="Canjeá entre cuentas ARS y USD del mismo workspace."
          size="md"
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
    </>
  );
}
