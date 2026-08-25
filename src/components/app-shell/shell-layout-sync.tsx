"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  mdUpMediaQuery,
  readShellLayoutCookie,
  shellLayoutCookieString,
  shellLayoutFromMatchMedia,
} from "./shell-layout";

/**
 * Keeps `fh-shell` aligned with `md` via matchMedia (not User-Agent).
 * First compact visit: write cookie, no refresh (RSC already assumed compact).
 * First full visit or resize mismatch: write + `router.refresh()` so the Panel
 * starts the matching read model.
 */
export function ShellLayoutSync() {
  const router = useRouter();

  useEffect(() => {
    const mql = window.matchMedia(mdUpMediaQuery());

    const sync = () => {
      const desired = shellLayoutFromMatchMedia(mql.matches);
      const current = readShellLayoutCookie(document.cookie);
      if (current === desired) return;
      document.cookie = shellLayoutCookieString(desired);
      if (current === null && desired === "compact") return;
      router.refresh();
    };

    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [router]);

  return null;
}
