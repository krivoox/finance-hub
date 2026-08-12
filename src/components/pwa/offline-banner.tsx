"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

function subscribeOnline(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerOnlineSnapshot() {
  return true;
}

/**
 * Soft-nav honesty when the device is offline (SPEC-20 H5).
 * Does not surface stale balances — points to `/offline`.
 */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerOnlineSnapshot,
  );

  if (online) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 border-b border-border bg-card px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] shadow-sm"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <WifiOff
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <p className="min-w-0 flex-1 text-xs text-muted-foreground text-pretty sm:text-sm">
          Sin conexión: no mostramos saldos. Podés dejar un borrador de carga.
        </p>
        <Button asChild size="sm" variant="outline" className="h-8 shrink-0">
          <Link href="/offline">Ver offline</Link>
        </Button>
      </div>
    </div>
  );
}
