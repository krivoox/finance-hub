import Link from "next/link";

import { SurfaceSection } from "@/components/surface-section";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format-money";
import { formatDateOnly } from "@/lib/format-date";
import { AddMemberForm } from "./add-member-form";
import { CreateSettlementForm } from "./create-settlement-form";

type Detail = Awaited<
  ReturnType<typeof import("@/features/splits/services").getSplitGroup>
>;

function kindLabel(kind: Detail["kind"]): string {
  return kind === "ongoing" ? "Algo que sigue" : "Algo de una vez";
}

export function SplitGroupDetail({
  group,
  shareUrl,
}: {
  group: Detail;
  shareUrl: string;
}) {
  return (
    <div className="space-y-4">
      <SurfaceSection>
        <p className="text-sm text-muted-foreground">{kindLabel(group.kind)}</p>
        <ul className="mt-4 space-y-2">
          {group.members.map((member) => (
            <li
              key={member.memberId}
              className="flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {member.displayName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.kind === "ghost" ? "Sólo el nombre" : "Tiene la app"}
                </p>
              </div>
              <Badge
                variant={
                  member.netCents > 0
                    ? "income"
                    : member.netCents < 0
                      ? "expense"
                      : "secondary"
                }
                className="tabular-nums"
              >
                {member.netCents > 0
                  ? `Le deben ${formatMoney(member.netCents, group.currency)}`
                  : member.netCents < 0
                    ? `Debe ${formatMoney(Math.abs(member.netCents), group.currency)}`
                    : "En paz"}
              </Badge>
            </li>
          ))}
        </ul>
      </SurfaceSection>

      <SurfaceSection>
        <h2 className="mb-3 font-heading text-sm font-extrabold text-foreground">
          Sumar a alguien
        </h2>
        <AddMemberForm splitGroupId={group.id} shareUrl={shareUrl} />
      </SurfaceSection>

      {group.members.length >= 2 ? (
        <SurfaceSection>
          <CreateSettlementForm
            splitGroupId={group.id}
            actorMemberId={group.actorMemberId}
            members={group.members}
          />
        </SurfaceSection>
      ) : null}

      <SurfaceSection>
        <h2 className="mb-3 font-heading text-sm font-extrabold text-foreground">
          Gastos divididos
        </h2>
        {group.activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay gastos divididos acá. Cargá un gasto y tildá «dividirlo
            con alguien».
          </p>
        ) : (
          <ul className="space-y-3">
            {group.activity.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.description || "Gasto"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pagó {item.paidByDisplayName}
                    <span className="text-border"> · </span>
                    {formatDateOnly(item.occurredOn)}
                  </p>
                </div>
                <p className="shrink-0 tabular-nums text-sm text-foreground">
                  {formatMoney(item.amountCents, item.currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm">
          <Link
            href="/transactions?new=expense"
            className="underline underline-offset-2"
          >
            Cargar un gasto
          </Link>
        </p>
      </SurfaceSection>
    </div>
  );
}
