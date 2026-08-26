"use client";

import { Users } from "lucide-react";

import type { ListedSplitGroup } from "@/features/splits/services";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { peopleCountLabel } from "./split-copy";
import { SplitLedgerRow } from "./split-ledger-row";
import { SplitNetAmount } from "./split-net-amount";
import { SplitOverflowMenu } from "./split-overflow-menu";

export function SplitGroupCard({
  group,
  onEdit,
  onDelete,
}: {
  group: ListedSplitGroup;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const canManage = Boolean(onEdit || onDelete);

  return (
    <SplitLedgerRow
      href={`/groups/${group.id}`}
      leading={
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
          aria-hidden
        >
          <Users className="size-4" strokeWidth={1.75} />
        </span>
      }
      title={group.name}
      caption={peopleCountLabel(group.memberCount)}
      trailing={
        <SplitNetAmount
          cents={group.myNetCents}
          currency={group.currency}
          className="text-xs sm:text-sm"
        />
      }
      menu={
        canManage ? (
          <SplitOverflowMenu label={`Acciones de ${group.name}`}>
            {onEdit ? (
              <DropdownMenuItem onSelect={onEdit}>Editar</DropdownMenuItem>
            ) : null}
            {onEdit && onDelete ? <DropdownMenuSeparator /> : null}
            {onDelete ? (
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                Eliminar
              </DropdownMenuItem>
            ) : null}
          </SplitOverflowMenu>
        ) : undefined
      }
    />
  );
}
