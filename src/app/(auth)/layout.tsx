import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:py-12">
        <div className="w-full max-w-sm space-y-8 rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="space-y-1 text-center">
            <Link
              href="/"
              className="font-heading text-lg font-extrabold tracking-tight text-foreground"
            >
              Finance Hub
            </Link>
            <p className="text-xs text-muted-foreground">
              Centro financiero del hogar
            </p>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
