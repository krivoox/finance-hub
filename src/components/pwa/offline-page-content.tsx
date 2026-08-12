"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import { WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  clearOfflineDraftFromStorage,
  readOfflineDraftFromStorage,
  writeOfflineDraftToStorage,
  type OfflineTransactionDraft,
} from "@/lib/offline-draft";
import { cn } from "@/lib/utils";

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function emptyDraft(): OfflineTransactionDraft {
  return {
    type: "expense",
    amountUnits: "",
    description: "",
    occurredOn: todayIsoDate(),
    updatedAt: new Date().toISOString(),
  };
}

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

function readInitialDraft(): OfflineTransactionDraft {
  if (typeof window === "undefined") return emptyDraft();
  return readOfflineDraftFromStorage(window.sessionStorage) ?? emptyDraft();
}

/**
 * Honest offline surface (SPEC-20 H5): no balances, draft in sessionStorage.
 */
export function OfflinePageContent() {
  const online = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerOnlineSnapshot,
  );
  const [draft, setDraft] = useState<OfflineTransactionDraft>(readInitialDraft);
  const [savedAt, setSavedAt] = useState<string | null>(() => {
    const initial = readInitialDraft();
    return initial.amountUnits || initial.description ? initial.updatedAt : null;
  });

  function persist(next: OfflineTransactionDraft) {
    const withStamp = { ...next, updatedAt: new Date().toISOString() };
    setDraft(withStamp);
    if (writeOfflineDraftToStorage(window.sessionStorage, withStamp)) {
      setSavedAt(withStamp.updatedAt);
    }
  }

  function handleClear() {
    clearOfflineDraftFromStorage(window.sessionStorage);
    setDraft(emptyDraft());
    setSavedAt(null);
  }

  const resumeHref =
    draft.type === "income"
      ? "/transactions?new=income"
      : "/transactions?new=expense";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-8 px-4 py-10">
      <div className="space-y-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <WifiOff className="size-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Sin conexión
        </h1>
        <p className="text-sm text-muted-foreground text-pretty">
          No podemos mostrar saldos ni el panel sin red. Podés dejar un
          borrador de gasto o ingreso acá; se guarda en este dispositivo hasta
          que vuelva la conexión.
        </p>
        <p
          className={cn(
            "text-xs font-medium",
            online ? "text-income" : "text-warning",
          )}
          role="status"
        >
          {online ? "Conexión restablecida" : "Modo avión / sin red"}
        </p>
      </div>

      <section
        aria-labelledby="offline-draft-title"
        className="space-y-4 rounded-2xl border border-border bg-card p-4"
      >
        <div className="space-y-1">
          <h2
            id="offline-draft-title"
            className="text-sm font-medium text-foreground"
          >
            Borrador de carga
          </h2>
          <p className="text-xs text-muted-foreground">
            No se envía al servidor hasta que haya red. No muestra patrimonio.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo">
          {(["expense", "income"] as const).map((type) => (
            <button
              key={type}
              type="button"
              className={cn(
                "h-10 rounded-full border text-sm font-medium transition-colors",
                draft.type === type
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground",
              )}
              aria-pressed={draft.type === type}
              onClick={() => persist({ ...draft, type })}
            >
              {type === "expense" ? "Gasto" : "Ingreso"}
            </button>
          ))}
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Monto
          </span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            value={draft.amountUnits}
            onChange={(event) =>
              persist({ ...draft, amountUnits: event.target.value })
            }
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Fecha
          </span>
          <input
            type="date"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            value={draft.occurredOn}
            onChange={(event) =>
              persist({ ...draft, occurredOn: event.target.value })
            }
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Nota (opcional)
          </span>
          <input
            type="text"
            maxLength={200}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            value={draft.description}
            onChange={(event) =>
              persist({ ...draft, description: event.target.value })
            }
          />
        </label>

        {savedAt ? (
          <p className="text-xs text-muted-foreground">
            Borrador guardado en este dispositivo.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          {online ? (
            <Button asChild className="h-10">
              <Link href={resumeHref}>Continuar carga en la app</Link>
            </Button>
          ) : (
            <Button type="button" className="h-10" disabled>
              Esperando red…
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            className="h-10"
            onClick={handleClear}
          >
            Borrar borrador
          </Button>
        </div>
      </section>

      {online ? (
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/dashboard" className="underline underline-offset-2">
            Volver al panel
          </Link>
        </p>
      ) : null}
    </main>
  );
}
