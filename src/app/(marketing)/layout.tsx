import type { ReactNode } from "react";

import "@/features/marketing/landing-motion.css";

/**
 * Marketing surfaces need document scroll. App shell caps viewport on its own.
 * Typography: Plus Jakarta Sans + Nunito display — same as product.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-svh overflow-x-hidden">{children}</div>;
}
