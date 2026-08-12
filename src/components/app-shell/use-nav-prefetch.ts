"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getPrefetchNavHrefs } from "./nav-config";

function scheduleIdle(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const ric = (
    window as Window & {
      requestIdleCallback?: (
        cb: IdleRequestCallback,
        opts?: IdleRequestOptions,
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    }
  ).requestIdleCallback;

  if (typeof ric === "function") {
    const id = ric(() => callback(), { timeout: 2500 });
    return () => {
      window.cancelIdleCallback?.(id);
    };
  }

  const id = globalThis.setTimeout(callback, 200);
  return () => globalThis.clearTimeout(id);
}

/**
 * Prefetch idle de destinos del menú (SPEC-20 H2).
 * Calienta shells RSC; no relaja staleTimes.dynamic ni cachea saldos.
 */
export function useNavPrefetch(enabled = true) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return;
    }

    const hrefs = getPrefetchNavHrefs();
    let cancelled = false;
    let index = 0;

    const cancelIdle = scheduleIdle(() => {
      const tick = () => {
        if (cancelled) return;
        const href = hrefs[index];
        if (!href) return;
        index += 1;
        try {
          router.prefetch(href);
        } catch {
          // Prefetch is best-effort.
        }
        if (index < hrefs.length) {
          scheduleIdle(tick);
        }
      };
      tick();
    });

    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [enabled, router]);
}
