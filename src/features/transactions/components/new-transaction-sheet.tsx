"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { FormSheet } from "@/components/form-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { replaceAndRefresh } from "@/lib/navigation";

import {
  getNewTransactionFormOptionsAction,
  type NewTransactionFormOptions,
} from "../actions/get-new-transaction-form-options";
import { useNewTransactionSheetStore } from "../stores/new-transaction-sheet-store";
import { NewTransactionForm } from "./new-transaction-form";

type NewTransactionSheetProps = {
  /** When false (viewer / no workspace), the sheet never mounts. */
  enabled: boolean;
  /** Active workspace id — used to invalidate cached options on switch. */
  workspaceId: string | null;
};

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; options: NewTransactionFormOptions }
  | { status: "error"; message: string };

function isTransactionCreateParam(value: string | null): boolean {
  return value === "1" || value === "transaction";
}

function FormOptionsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando">
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
  const setOpen = useNewTransactionSheetStore((s) => s.setOpen);
  const openSheet = useNewTransactionSheetStore((s) => s.openSheet);

  const [load, setLoad] = useState<LoadState>({ status: "idle" });
  const cacheRef = useRef<{
    workspaceId: string;
    options: NewTransactionFormOptions;
  } | null>(null);

  // Deep-link: /transactions?new=1 | ?new=transaction
  useEffect(() => {
    if (!enabled) return;
    const newParam = searchParams.get("new");
    if (isTransactionCreateParam(newParam)) {
      openSheet();
    }
  }, [enabled, searchParams, openSheet]);

  // Drop cached options when the active workspace changes.
  useEffect(() => {
    cacheRef.current = null;
    setLoad({ status: "idle" });
  }, [workspaceId]);

  // Fetch options when the sheet opens.
  useEffect(() => {
    if (!open || !enabled || !workspaceId) return;

    const cached = cacheRef.current;
    if (cached && cached.workspaceId === workspaceId) {
      setLoad({ status: "ready", options: cached.options });
      return;
    }

    let cancelled = false;
    setLoad({ status: "loading" });

    void getNewTransactionFormOptionsAction().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setLoad({ status: "error", message: result.error });
        return;
      }
      cacheRef.current = {
        workspaceId,
        options: result.data,
      };
      setLoad({ status: "ready", options: result.data });
    });

    return () => {
      cancelled = true;
    };
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
    cacheRef.current = null;
    setLoad({ status: "idle" });
    handleOpenChange(false);
  }

  if (!enabled) return null;

  const currencyHint =
    load.status === "ready"
      ? load.options.workspaceCurrency
      : "ARS o USD";

  return (
    <FormSheet
      open={open}
      onOpenChange={(next) => handleOpenChange(next)}
      title="Nueva transacción"
      description={`Gasto, ingreso o transferencia. Elegí la moneda (default ${currencyHint}).`}
      size="lg"
    >
      {load.status === "loading" || load.status === "idle" ? (
        <FormOptionsSkeleton />
      ) : null}

      {load.status === "error" ? (
        <p className="text-sm text-muted-foreground text-pretty">
          {load.message}
        </p>
      ) : null}

      {load.status === "ready" && load.options.accounts.length === 0 ? (
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
      ) : null}

      {load.status === "ready" && load.options.accounts.length > 0 ? (
        <NewTransactionForm
          key={load.options.workspaceId}
          workspaceId={load.options.workspaceId}
          workspaceName={load.options.workspaceName}
          workspaceCurrency={load.options.workspaceCurrency}
          accounts={load.options.accounts}
          paymentAccountGroups={load.options.paymentAccountGroups}
          categories={load.options.categories}
          groupMembers={load.options.groupMembers}
          currentUserId={load.options.currentUserId}
          onSuccess={handleSuccess}
          onCancel={() => handleOpenChange(false)}
        />
      ) : null}
    </FormSheet>
  );
}

/**
 * Global create sheet for new transactions. Mount once in the authenticated
 * app shell. Opens instantly; options load inside the sheet.
 */
export function NewTransactionSheet(props: NewTransactionSheetProps) {
  return (
    <Suspense fallback={null}>
      <NewTransactionSheetInner {...props} />
    </Suspense>
  );
}
