import type { Metadata } from "next";

import { OfflinePageContent } from "@/components/pwa/offline-page-content";

export const metadata: Metadata = {
  title: "Sin conexión",
  description:
    "Sin red no mostramos saldos. Podés dejar un borrador de gasto o ingreso.",
  robots: { index: false, follow: false },
};

/**
 * Public offline surface (SPEC-20 H5). Never shows balances.
 * Precached by the selective Service Worker for navigation fallback.
 */
export default function OfflinePage() {
  return <OfflinePageContent />;
}
