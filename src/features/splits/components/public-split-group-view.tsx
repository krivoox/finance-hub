import type { ReactNode } from "react";

import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import { formatMoney } from "@/lib/format-money";
import { peopleCountLabel } from "./split-copy";
import { SplitLedgerRow } from "./split-ledger-row";
import { SplitNetAmount } from "./split-net-amount";

type PublicView = Awaited<
  ReturnType<typeof import("@/features/splits/services").getPublicSplitGroup>
>;

export function PublicSplitGroupView({
  group,
  children,
}: {
  group: PublicView;
  children?: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <header className="space-y-1">
          <p className="font-heading text-lg font-extrabold tracking-tight text-foreground">
            Finance Hub
          </p>
          <p className="text-xs text-muted-foreground">
            Centro financiero del hogar
          </p>
        </header>

        <SurfaceSection>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-heading text-lg font-extrabold tracking-tight text-foreground text-balance sm:text-xl">
                {group.name}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Saldos de este grupo. Sin cuentas ni movimientos personales.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-background/70 px-2.5 py-1 text-xs font-medium text-muted-foreground dark:bg-background/40">
              {peopleCountLabel(group.members.length)}
            </span>
          </div>
        </SurfaceSection>

        <SurfaceSection>
          <SurfaceHeader title="Saldos" />
          <ul className="divide-y divide-border">
            {group.members.map((member) => (
              <li key={member.displayName} className="min-w-0">
                <SplitLedgerRow
                  title={member.displayName}
                  trailing={
                    <SplitNetAmount
                      cents={member.netCents}
                      currency={group.currency}
                      className="text-xs sm:text-sm"
                    />
                  }
                />
              </li>
            ))}
          </ul>
        </SurfaceSection>

        <SurfaceSection>
          <SurfaceHeader title="Movimientos" />
          {group.activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay movimientos.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {group.activity.map((item, index) => (
                <li
                  key={`${item.paidByDisplayName}-${index}`}
                  className="min-w-0"
                >
                  <SplitLedgerRow
                    leading={
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-expense-muted text-sm"
                        aria-hidden
                      >
                        🧾
                      </span>
                    }
                    title={item.description || "Gasto"}
                    caption={`Pagó ${item.paidByDisplayName}`}
                    trailing={
                      <p className="text-xs tabular sm:text-sm text-foreground">
                        {formatMoney(item.amountCents, group.currency)}
                      </p>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </SurfaceSection>

        {children}
      </div>
    </main>
  );
}
