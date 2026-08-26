import { CalendarDays, House } from "lucide-react";

import type { ListedSplitGroup } from "@/features/splits/services";
import { peopleCountLabel, splitGroupKindLabel } from "./split-copy";
import { SplitLedgerRow } from "./split-ledger-row";
import { SplitNetAmount } from "./split-net-amount";

export function SplitGroupCard({ group }: { group: ListedSplitGroup }) {
  const Icon = group.kind === "ongoing" ? House : CalendarDays;

  return (
    <SplitLedgerRow
      href={`/groups/${group.id}`}
      leading={
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
          aria-hidden
        >
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
      }
      title={group.name}
      caption={`${splitGroupKindLabel(group.kind)} · ${peopleCountLabel(group.memberCount)}`}
      trailing={
        <SplitNetAmount
          cents={group.myNetCents}
          currency={group.currency}
          className="text-xs sm:text-sm"
        />
      }
    />
  );
}
