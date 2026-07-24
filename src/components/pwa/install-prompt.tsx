"use client";

import { useEffect, useState, startTransition } from "react";
import { Download, Share, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "fh:pwa-install:v1";
const DISMISS_MS = 30 * 24 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type DismissState = {
  dismissedAt: number;
};

function readDismissed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as DismissState;
    if (typeof parsed.dismissedAt !== "number") return false;
    return Date.now() - parsed.dismissedAt < DISMISS_MS;
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    const payload: DismissState = { dismissedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // private mode / quota
  }
}

function isStandaloneDisplay(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function isIosDevice(): boolean {
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  return (
    window.navigator.platform === "MacIntel" &&
    window.navigator.maxTouchPoints > 1
  );
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [standalone, setStandalone] = useState(true);
  const [ios, setIos] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");

    startTransition(() => {
      setDismissed(readDismissed());
      setStandalone(isStandaloneDisplay());
      setIos(isIosDevice());
      setMobile(media.matches);
    });

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      writeDismissed();
      setDeferredPrompt(null);
      setStandalone(true);
      setDismissed(true);
    };

    const onViewportChange = () => {
      setMobile(media.matches);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    media.addEventListener("change", onViewportChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      media.removeEventListener("change", onViewportChange);
    };
  }, []);

  const mode = deferredPrompt ? "chromium" : ios ? "ios" : null;
  const visible = !standalone && !dismissed && mobile && mode !== null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === "accepted") {
      writeDismissed();
      setDismissed(true);
      setStandalone(true);
    }
  }

  function handleDismiss() {
    writeDismissed();
    setDismissed(true);
  }

  if (!visible || !mode) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-desc"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2",
        "md:hidden",
      )}
    >
      <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-3 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-info-muted text-info-muted-foreground">
            <Download className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p
              id="pwa-install-title"
              className="text-sm font-medium text-foreground"
            >
              Instalá Finance Hub
            </p>
            <p
              id="pwa-install-desc"
              className="mt-0.5 text-xs text-muted-foreground"
            >
              Accedé más rápido desde tu pantalla de inicio, como una app.
            </p>

            {mode === "ios" && showIosSteps ? (
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                <li>
                  Tocá{" "}
                  <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
                    Compartir <Share className="size-3" aria-hidden />
                  </span>{" "}
                  en Safari
                </li>
                <li>
                  Elegí{" "}
                  <span className="font-medium text-foreground">
                    Añadir a pantalla de inicio
                  </span>
                </li>
                <li>
                  Confirmá con{" "}
                  <span className="font-medium text-foreground">Añadir</span>
                </li>
              </ol>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {mode === "chromium" ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-9 px-3"
                  onClick={() => void handleInstall()}
                >
                  Instalar
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="h-9 px-3"
                  onClick={() => setShowIosSteps((open) => !open)}
                >
                  {showIosSteps ? "Ocultar pasos" : "Cómo instalar"}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 px-3"
                onClick={handleDismiss}
              >
                Ahora no
              </Button>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            aria-label="Cerrar"
            onClick={handleDismiss}
          >
            <X />
          </Button>
        </div>
      </div>
    </div>
  );
}
