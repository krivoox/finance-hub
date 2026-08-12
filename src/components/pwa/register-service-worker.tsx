"use client";

import { useEffect } from "react";

/**
 * Registers the selective SW in production only (SPEC-20 H4).
 * Scope: cache-first `/_next/static/*` + offline navigation fallback.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Registration failure must not break the app shell.
      });
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  return null;
}
