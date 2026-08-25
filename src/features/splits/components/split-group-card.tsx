"use client";

import Link from "next/link";
import { Users } from "lucide-react";

import { SurfaceSection } from "@/components/surface-section";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format-money";
import type { ListedSplitGroup } from "@/features/splits/services";

function kindLabel(kind: ListedSplitGroup["kind"]): string {
  return kind === "ongoing" ? "Algo que sigue" : "Algo de una vez";
}

export function SplitGroupCard({ group }: { group: ListedSplitGroup }) {
  return (
    <Link
      href={`/groups/${group.id}`}
      aria-label={`Abrir ${group.name}`}
      className="block min-w-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <SurfaceSection className="transition-colors hover:bg-muted/40">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Users className="size-4" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-sm font-extrabold tracking-tight text-foreground">
              {group.name}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {kindLabel(group.kind)}
              <span className="text-border"> · </span>
              {group.memberCount === 1
                ? "1 persona"
                : `${group.memberCount} personas`}
            </p>
          </div>
          <Badge
            variant={
              group.myNetCents > 0
                ? "income"
                : group.myNetCents < 0
                  ? "expense"
                  : "secondary"
            }
            className="max-w-[46%] shrink-0 truncate tabular-nums"
          >
            {group.myNetCents > 0
              ? `Te deben ${formatMoney(group.myNetCents, group.currency)}`
              : group.myNetCents < 0
                ? `Debés ${formatMoney(Math.abs(group.myNetCents), group.currency)}`
                : "En paz"}
          </Badge>
        </div>
      </SurfaceSection>
    </Link>
  );
}
