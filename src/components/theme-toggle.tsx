"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@teispace/next-themes";
import { useSyncExternalStore } from "react";

import { SegmentedControl } from "@/components/form-sheet/segmented-control";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

type ThemeValue = (typeof THEME_OPTIONS)[number]["value"];

const THEME_SEGMENT_OPTIONS: readonly { value: ThemeValue; label: string }[] =
  THEME_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  }));

const emptySubscribe = () => () => {};

/** True after hydration — avoids SSR/client theme icon mismatch. */
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle({
  className,
  variant = "menu",
}: {
  className?: string;
  /** `inline` for sheets — no dropdown (nested modal would swallow taps). */
  variant?: "menu" | "inline";
}) {
  if (variant === "inline") {
    return <ThemeToggleInline className={className} />;
  }

  return <ThemeToggleMenu className={className} />;
}

function ThemeToggleMenu({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { isMobile, setOpenMobile } = useSidebar();
  const mounted = useIsClient();

  const current =
    THEME_OPTIONS.find((o) => o.value === theme) ?? THEME_OPTIONS[2];

  // Until mount, render a stable icon — never branch on resolvedTheme
  // (server cookie / system preference can disagree with the client).
  const CurrentIcon = !mounted
    ? Monitor
    : theme === "system"
      ? resolvedTheme === "dark"
        ? Moon
        : Sun
      : current.icon;

  return (
    <SidebarMenu className={className}>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              tooltip="Tema"
              suppressHydrationWarning
              className={cn(!mounted && "pointer-events-none opacity-70")}
            >
              <CurrentIcon strokeWidth={1.75} />
              <span>Tema</span>
              <span className="ml-auto text-xs text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                {mounted ? current.label : "…"}
              </span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            className="min-w-44"
            sideOffset={6}
          >
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active = mounted && theme === option.value;

              return (
                <DropdownMenuItem
                  key={option.value}
                  className="gap-2"
                  onSelect={() => {
                    setTheme(option.value);
                    if (isMobile) setOpenMobile(false);
                  }}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                  {option.label}
                  {active ? (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Activo
                    </span>
                  ) : null}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/** Segmented control for the mobile “Más” sheet — tappable inside a modal. */
function ThemeToggleInline({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useIsClient();

  const value: ThemeValue =
    mounted && THEME_OPTIONS.some((o) => o.value === theme)
      ? (theme as ThemeValue)
      : "system";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-sm font-medium text-foreground">Tema</p>
      <SegmentedControl
        value={value}
        options={THEME_SEGMENT_OPTIONS}
        onChange={(next) => setTheme(next)}
        ariaLabel="Tema de la interfaz"
        disabled={!mounted}
      />
    </div>
  );
}

/** Compact icon control for headers / non-sidebar surfaces. */
export function ThemeToggleButton({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useIsClient();

  // Stable placeholder until mount to avoid SSR/client icon mismatch.
  const isDark = mounted && resolvedTheme === "dark";
  const Icon = !mounted ? Monitor : isDark ? Sun : Moon;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-8", className)}
      aria-label={
        !mounted
          ? "Tema"
          : isDark
            ? "Cambiar a tema claro"
            : "Cambiar a tema oscuro"
      }
      disabled={!mounted}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Icon className="size-4" strokeWidth={1.75} />
    </Button>
  );
}
