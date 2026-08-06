/**
 * Detect installed / standalone display modes (Add to Home Screen, TWA, etc.).
 * Shared by install prompt and OAuth (PWA cookie isolation on iOS).
 */
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}
