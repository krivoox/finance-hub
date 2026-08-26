import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import { formatDateOnly } from "@/lib/format-date";
import { formatMoney } from "@/lib/format-money";
import { CategorySpendingDonut } from "@/features/dashboard/components/category-spending-donut";
import { OpenNewTransactionButton } from "@/features/transactions/components/open-new-transaction-button";
import { AddMemberForm } from "./add-member-form";
import { CreateSettlementSheet } from "./create-settlement-sheet";
import {
  actorNetHint,
  memberKindCaption,
  peopleCountLabel,
} from "./split-copy";
import { SplitGroupActivityTabs } from "./split-group-activity-tabs";
import { SplitLedgerRow } from "./split-ledger-row";
import { SplitMemberActions } from "./split-member-actions";
import { SplitNetAmount } from "./split-net-amount";

type Detail = Awaited<
  ReturnType<typeof import("@/features/splits/services").getSplitGroup>
>;

type LedgerLine = {
  id: string;
  occurredOn: Date | string;
  title: string;
  subtitle: string;
  amountLabel: string;
  kind: "expense" | "settlement";
};

function buildLedger(group: Detail): LedgerLine[] {
  const nameById = new Map(
    group.members.map((m) => [m.memberId, m.displayName]),
  );
  const splits: LedgerLine[] = group.activity.map((item) => ({
    id: item.id,
    occurredOn: item.occurredOn,
    title: item.description || "Gasto",
    subtitle: `Pagó ${item.paidByDisplayName} · ${formatDateOnly(item.occurredOn)}`,
    amountLabel: formatMoney(item.amountCents, item.currency),
    kind: "expense",
  }));
  const settlements: LedgerLine[] = group.settlements.map((item) => ({
    id: item.id,
    occurredOn: item.occurredOn,
    title: "Cobro anotado",
    subtitle: `${nameById.get(item.fromMemberId) ?? "Alguien"} → ${nameById.get(item.toMemberId) ?? "Alguien"} · ${formatDateOnly(item.occurredOn)}`,
    amountLabel: formatMoney(item.amountCents, group.currency),
    kind: "settlement",
  }));
  return [...splits, ...settlements].toSorted((a, b) => {
    const aTime = new Date(a.occurredOn).getTime();
    const bTime = new Date(b.occurredOn).getTime();
    return bTime - aTime;
  });
}

export function SplitGroupDetail({
  group,
  shareUrl,
}: {
  group: Detail;
  shareUrl: string;
}) {
  const actor = group.members.find((m) => m.memberId === group.actorMemberId);
  const actorNet = actor?.netCents ?? 0;
  const ledger = buildLedger(group);
  const canSettle = group.members.length >= 2;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div>
        <Link
          href="/groups"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
          Volver a grupos
        </Link>
      </div>

      <SurfaceSection aria-label="Tu diferencia en el grupo">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Tu diferencia
            </h2>
            <p className="mt-1.5 max-w-full text-2xl font-semibold tracking-tight break-words tabular-nums sm:text-3xl md:text-4xl">
              <SplitNetAmount cents={actorNet} currency={group.currency} />
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {actorNetHint(actorNet)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-background/70 px-2.5 py-1 text-xs font-medium text-muted-foreground dark:bg-background/40">
            {peopleCountLabel(group.members.length)}
          </span>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <OpenNewTransactionButton
            label="Registrar gasto"
            className="w-full sm:w-auto"
          />
          {canSettle ? (
            <CreateSettlementSheet
              splitGroupId={group.id}
              actorMemberId={group.actorMemberId}
              members={group.members}
            />
          ) : null}
        </div>
      </SurfaceSection>

      <SurfaceSection>
        <SurfaceHeader
          title="Saldos"
          description="Lo que cada persona tiene a favor o en contra"
        />
        <ul className="-mx-2 divide-y divide-border">
          {group.members.map((member) => (
            <li key={member.memberId} className="min-w-0">
              <SplitLedgerRow
                title={member.displayName}
                caption={memberKindCaption(
                  member.kind,
                  member.memberId === group.actorMemberId,
                )}
                trailing={
                  <SplitNetAmount
                    cents={member.netCents}
                    currency={group.currency}
                    className="text-xs sm:text-sm"
                  />
                }
                menu={
                  member.canRename || member.canRemove ? (
                    <SplitMemberActions
                      splitGroupId={group.id}
                      memberId={member.memberId}
                      displayName={member.displayName}
                      isSelf={member.memberId === group.actorMemberId}
                      canRename={member.canRename}
                      canRemove={member.canRemove}
                    />
                  ) : undefined
                }
              />
            </li>
          ))}
        </ul>
      </SurfaceSection>

      <SurfaceSection>
        <SurfaceHeader
          title="Movimientos"
          description="Gastos imputados y cobros anotados"
        />
        <SplitGroupActivityTabs
          ledger={
            ledger.length === 0 ? (
              <p className="text-sm text-muted-foreground text-pretty">
                Todavía no hay movimientos. Registrá un gasto y tildá «dividirlo
                con alguien».
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {ledger.map((item) => (
                  <li key={item.id} className="min-w-0">
                    <SplitLedgerRow
                      leading={
                        <span
                          className={
                            item.kind === "expense"
                              ? "flex size-9 shrink-0 items-center justify-center rounded-lg bg-expense-muted text-sm"
                              : "flex size-9 shrink-0 items-center justify-center rounded-lg bg-transfer-muted text-sm"
                          }
                          aria-hidden
                        >
                          {item.kind === "expense" ? "🧾" : "🔄"}
                        </span>
                      }
                      title={item.title}
                      caption={item.subtitle}
                      trailing={
                        <p className="text-xs tabular sm:text-sm text-foreground">
                          {item.amountLabel}
                        </p>
                      }
                    />
                  </li>
                ))}
              </ul>
            )
          }
          categories={
            <CategorySpendingDonut
              currency={group.currency}
              rows={group.spendingByCategory}
              emptyMessage="Todavía no hay gastos divididos. Los cobros anotados no entran."
            />
          }
        />
      </SurfaceSection>

      <SurfaceSection>
        <SurfaceHeader
          title="Personas"
          description="Anotá un nombre o compartí el enlace de saldos"
        />
        <AddMemberForm
          splitGroupId={group.id}
          shareUrl={shareUrl}
          groupName={group.name}
        />
      </SurfaceSection>
    </div>
  );
}
