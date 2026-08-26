"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster richColors position="top-right" closeButton />
    </>
  );
}
