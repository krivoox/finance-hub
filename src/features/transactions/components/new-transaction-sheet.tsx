"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { FormSheet, FormSheetBody } from "@/components/form-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { replaceAndRefresh } from "@/lib/navigation";

import type { NewTransactionFormOptions } from "../actions/get-new-transaction-form-options";
import type { CreateableTransactionType } from "../domain";
import {
  initialTypeFromCreateParam,
  isTransactionCreateParam,
} from "../domain/create-param";
import {
  prefetchNewTransactionFormOptions,
  refreshNewTransactionFormOptions,
  useNewTransactionFormOptionsStore,
} from "../stores/new-transaction-form-options-store";
import { useNewTransactionSheetStore } from "../stores/new-transaction-sheet-store";
import { NewTransactionForm } from "./new-transaction-form";

type NewTransactionSheetProps = {
  /** When false (viewer / no workspace), the sheet never mounts. */
  enabled: boolean;
  /** Active workspace id — used to invalidate cached options on switch. */
  workspaceId: string | null;
};

function FormOptionsSkeleton() {
  return (
    <div className="flex min-h-0 flex-col gap-4" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-3/4 rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="mt-2 flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
    </div>
  );
}

function NewTransactionSheetInner({
  enabled,
  workspaceId,
}: NewTransactionSheetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const open = useNewTransactionSheetStore((s) => s.open);
  const initialType = useNewTransactionSheetStore((s) => s.initialType);
  const setOpen = useNewTransactionSheetStore((s) => s.setOpen);
  const openSheet = useNewTransactionSheetStore((s) => s.openSheet);

  const options = useNewTransactionFormOptionsStore((s) =>
    workspaceId ? (s.byWorkspaceId[workspaceId] ?? null) : null,
  );
  const loadingWorkspaceId = useNewTransactionFormOptionsStore(
    (s) => s.loadingWorkspaceId,
  );
  const error = useNewTransactionFormOptionsStore((s) => s.error);

  // Warm catalogs as soon as the shell mounts so Registrar opens with fields.
  useEffect(() => {
    if (!enabled || !workspaceId) return;
    prefetchNewTransactionFormOptions(workspaceId);
  }, [enabled, workspaceId]);

  // Deep-link: /transactions?new=1|transaction|expense|income (SPEC-20 shortcuts)
  useEffect(() => {
    if (!enabled) return;
    const newParam = searchParams.get("new");
    if (isTransactionCreateParam(newParam)) {
      openSheet({ initialType: initialTypeFromCreateParam(newParam) });
    }
  }, [enabled, searchParams, openSheet]);

  // Stale-while-revalidate: cached options paint immediately; refresh in background.
  useEffect(() => {
    if (!open || !enabled || !workspaceId) return;
    void refreshNewTransactionFormOptions(workspaceId);
  }, [open, enabled, workspaceId]);

  function clearTransactionCreateQuery(opts?: { refresh?: boolean }) {
    if (!isTransactionCreateParam(searchParams.get("new"))) return;
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

  function handleOpenChange(next: boolean, opts?: { refresh?: boolean }) {
    setOpen(next);
    if (!next) {
      clearTransactionCreateQuery(opts);
    }
  }

  function handleSuccess() {
    handleOpenChange(false);
  }

  if (!enabled) return null;

  const showSkeleton =
    open && !options && (loadingWorkspaceId === workspaceId || !error);
  const showError = open && !options && Boolean(error);
  const emptyAccounts = open && options && options.accounts.length === 0;
  const showForm = open && options && options.accounts.length > 0;

  return (
    <FormSheet
      open={open}
      onOpenChange={(next) => handleOpenChange(next)}
      title="Nueva transacción"
      description={`Gasto, ingreso, transferencia o ajuste. Elegí la moneda (default ${options?.workspaceCurrency ?? "ARS o USD"}).`}
      size="lg"
      layout="fill"
    >
      {showSkeleton ? (
        <FormSheetBody>
          <FormOptionsSkeleton />
        </FormSheetBody>
      ) : null}

      {showError ? (
        <FormSheetBody>
          <p className="text-sm text-muted-foreground text-pretty">
            {error}
          </p>
        </FormSheetBody>
      ) : null}

      {emptyAccounts ? (
        <FormSheetBody>
          <p className="text-sm text-muted-foreground text-pretty">
            Necesitás al menos una cuenta activa para registrar transacciones.{" "}
            <Link
              href="/accounts"
              className="font-medium text-foreground underline"
              onClick={() => handleOpenChange(false)}
            >
              Ir a cuentas
            </Link>
          </p>
        </FormSheetBody>
      ) : null}

      {showForm && options ? (
        <SheetForm
          options={options}
          initialType={initialType}
          onSuccess={handleSuccess}
        />
      ) : null}
    </FormSheet>
  );
}

function SheetForm({
  options,
  initialType,
  onSuccess,
}: {
  options: NewTransactionFormOptions;
  initialType: CreateableTransactionType;
  onSuccess: () => void;
}) {
  return (
    <NewTransactionForm
      key={`${options.workspaceId}:${initialType}`}
      workspaceId={options.workspaceId}
      workspaceCurrency={options.workspaceCurrency}
      accounts={options.accounts}
      categories={options.categories}
      splitGroups={options.splitGroups}
      currentUserId={options.currentUserId}
      initialType={initialType}
      layout="sheet"
      onSuccess={onSuccess}
    />
  );
}

/**
 * Global create sheet for new transactions. Mount once in the authenticated
 * app shell. Catalogs prefetch on mount so the sheet opens with fields ready.
 */
export function NewTransactionSheet(props: NewTransactionSheetProps) {
  return (
    <Suspense fallback={null}>
      <NewTransactionSheetInner {...props} />
    </Suspense>
  );
}
