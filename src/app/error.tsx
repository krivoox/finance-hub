"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-expense-muted text-expense">
          <AlertCircle className="size-6" aria-hidden />
        </div>
        <div className="space-y-1">
          <h1 className="font-heading text-xl font-extrabold tracking-tight text-foreground">
            Algo salió mal
          </h1>
          <p className="text-sm text-muted-foreground text-pretty">
            No pudimos cargar esta pantalla. Probá de nuevo.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" className="w-full" onClick={reset}>
            Reintentar
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard">Volver al panel</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
