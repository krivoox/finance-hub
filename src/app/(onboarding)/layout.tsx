import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="relative min-h-dvh bg-background">
      {/* Soft canvas — quiet paper field, no app chrome */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-muted/40" />
        <div className="absolute -left-1/4 top-0 h-[55%] w-[70%] rounded-full bg-info-muted/50 blur-3xl" />
        <div className="absolute -right-1/4 bottom-0 h-[50%] w-[65%] rounded-full bg-muted/80 blur-3xl" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
