import type { ReactNode } from "react";

import "@/features/marketing/landing-motion.css";

/**
 * Marketing surfaces need document scroll. App shell caps viewport on its own.
 * Typography: same as product (Geist) — no separate display face.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-svh overflow-x-hidden">{children}</div>;
}
