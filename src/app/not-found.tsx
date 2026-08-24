import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <FileQuestion className="size-6" aria-hidden />
        </div>
        <div className="space-y-1">
          <h1 className="font-heading text-xl font-extrabold tracking-tight text-foreground">
            Página no encontrada
          </h1>
          <p className="text-sm text-muted-foreground text-pretty">
            Esa ruta no existe o ya no está disponible.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/dashboard">Volver al panel</Link>
        </Button>
      </div>
    </main>
  );
}
