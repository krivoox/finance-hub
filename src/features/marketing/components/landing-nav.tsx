import Link from "next/link";

import { ThemeToggleButton } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#funciones", label: "Funciones" },
  { href: "#faq", label: "FAQ" },
] as const;

type LandingNavProps = {
  className?: string;
};

export function LandingNav({ className }: LandingNavProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)] sm:h-16 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-sm font-semibold tracking-tight text-foreground"
        >
          Finance Hub
        </Link>

        <nav
          aria-label="Secciones"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 md:flex"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggleButton className="size-9 rounded-full" />
          <Button
            variant="ghost"
            size="sm"
            className="hidden h-9 rounded-full px-3 sm:inline-flex"
            asChild
          >
            <Link href="/login">Iniciar sesión</Link>
          </Button>
          <Button size="sm" className="h-9 rounded-full px-4" asChild>
            <Link href="/registro">Crear cuenta</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
