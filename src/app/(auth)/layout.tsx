import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Finance Hub
            </Link>
            <p className="text-xs text-muted-foreground">
              Tu centro de administración financiera
            </p>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
