"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { FormSheet, FormSheetBody } from "@/components/form-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { replaceAndRefresh } from "@/lib/navigation";

import {
  getNewTransactionFormOptionsAction,
  type NewTransactionFormOptions,
} from "../actions/get-new-transaction-form-options";
import {
  initialTypeFromCreateParam,
  isTransactionCreateParam,
} from "../domain/create-param";
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
  const initialType = useNewTransactionSheetStore((s) => s.initialType);
  const setOpen = useNewTransactionSheetStore((s) => s.setOpen);
  const openSheet = useNewTransactionSheetStore((s) => s.openSheet);

  const [load, setLoad] = useState<LoadState>({ status: "idle" });
  const cacheRef = useRef<{
    workspaceId: string;
    options: NewTransactionFormOptions;
  } | null>(null);
  const loadWorkspaceId =
    load.status === "ready" ? load.options.workspaceId : null;

  // If workspace switched while showing ready options, drop stale UI.
  const visibleLoad: LoadState =
    load.status === "ready" &&
    workspaceId &&
    loadWorkspaceId &&
    loadWorkspaceId !== workspaceId
      ? { status: "idle" }
      : load;

  // Deep-link: /transactions?new=1|transaction|expense|income (SPEC-20 shortcuts)
  useEffect(() => {
    if (!enabled) return;
    const newParam = searchParams.get("new");
    if (isTransactionCreateParam(newParam)) {
      openSheet({ initialType: initialTypeFromCreateParam(newParam) });
    }
  }, [enabled, searchParams, openSheet]);

  // Fetch options when the sheet opens (cache keyed by workspace).
  useEffect(() => {
    if (!open || !enabled || !workspaceId) return;

    let cancelled = false;
    const cached = cacheRef.current;
    // Show last options instantly, but always refetch: a group or member
    // created after the previous open would otherwise be missing.
    if (cached && cached.workspaceId === workspaceId) {
      setLoad({ status: "ready", options: cached.options });
    } else {
      setLoad({ status: "loading" });
    }

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
    visibleLoad.status === "ready"
      ? visibleLoad.options.workspaceCurrency
      : "ARS o USD";

  return (
    <FormSheet
      open={open}
      onOpenChange={(next) => handleOpenChange(next)}
      title="Nueva transacción"
      description={`Gasto, ingreso o transferencia. Elegí la moneda (default ${currencyHint}).`}
      size="lg"
      layout="fill"
    >
      {visibleLoad.status === "loading" || visibleLoad.status === "idle" ? (
        <FormSheetBody>
          <FormOptionsSkeleton />
        </FormSheetBody>
      ) : null}

      {visibleLoad.status === "error" ? (
        <FormSheetBody>
          <p className="text-sm text-muted-foreground text-pretty">
            {visibleLoad.message}
          </p>
        </FormSheetBody>
      ) : null}

      {visibleLoad.status === "ready" &&
      visibleLoad.options.accounts.length === 0 ? (
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

      {visibleLoad.status === "ready" &&
      visibleLoad.options.accounts.length > 0 ? (
        <NewTransactionForm
          key={`${visibleLoad.options.workspaceId}:${initialType}`}
          workspaceId={visibleLoad.options.workspaceId}
          workspaceName={visibleLoad.options.workspaceName}
          workspaceCurrency={visibleLoad.options.workspaceCurrency}
          accounts={visibleLoad.options.accounts}
          categories={visibleLoad.options.categories}
          splitGroups={visibleLoad.options.splitGroups}
          currentUserId={visibleLoad.options.currentUserId}
          initialType={initialType}
          layout="sheet"
          onSuccess={handleSuccess}
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
