import * as React from "react";
import { useSyncExternalStore } from "react";

import { MD_MIN_WIDTH_PX } from "@/lib/breakpoints";

function subscribeMdUp(onStoreChange: () => void) {
  const mql = window.matchMedia(`(min-width: ${MD_MIN_WIDTH_PX}px)`);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

/**
 * `true` from `md` (768px) up. SSR snapshot is `false` so overlays that
 * differ by viewport (FormSheet bottom vs right) paint mobile-first.
 */
export function useIsMdUp() {
  return useSyncExternalStore(
    subscribeMdUp,
    () => window.matchMedia(`(min-width: ${MD_MIN_WIDTH_PX}px)`).matches,
    () => false,
  );
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MD_MIN_WIDTH_PX - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MD_MIN_WIDTH_PX);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MD_MIN_WIDTH_PX);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
