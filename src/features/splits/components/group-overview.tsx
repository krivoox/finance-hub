import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format-money";
import { getGroupOverview } from "@/features/splits/services";

type GroupOverview = Awaited<ReturnType<typeof getGroupOverview>> | null;

export async function GroupOverviewSection({
  overview: overviewPromise,
}: {
  overview: Promise<GroupOverview>;
}) {
  const overview = await overviewPromise;

  if (!overview) {
    return (
      <p className="text-sm text-muted-foreground">
        Este workspace no es grupal.
      </p>
    );
  }

  return (
    <>
      <div className="mb-8 space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {overview.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          Patrimonio neto:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {formatMoney(overview.totalBalance.amountCents, overview.currency)}
          </span>
        </p>
      </div>

      <section className="mb-8">
        <h3 className="mb-3 text-sm font-medium text-foreground">
          Balances entre miembros
        </h3>
        {overview.memberBalances.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin miembros.</p>
        ) : (
          <ul className="divide-y divide-border">
            {overview.memberBalances.map((member) => (
                <li
                  key={member.userId}
                  className="flex min-w-0 items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <p className="min-w-0 flex-1 truncate font-medium text-foreground">
                    {member.displayName}
                  </p>
                  <Badge
                    variant={member.netCents >= 0 ? "income" : "expense"}
                    className="max-w-[50%] shrink-0 truncate tabular-nums"
                  >
                  {member.netCents >= 0 ? "Le deben " : "Debe "}
                  {formatMoney(Math.abs(member.netCents), overview.currency)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-medium text-foreground">
          Actividad reciente
        </h3>
        {overview.recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin movimientos aún.</p>
        ) : (
          <ul className="divide-y divide-border">
            {overview.recentActivity.map((tx) => (
              <li key={tx.id} className="first:pt-0 last:pb-0">
                <Link
                  href={`/transactions/${tx.id}`}
                  className="flex min-w-0 items-center gap-3 py-3 text-sm hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {tx.description || tx.categoryName || tx.type}
                    </p>
                    <p className="truncate text-muted-foreground">
                      {tx.accountName}
                      <span className="text-border"> · </span>
                      Registró {tx.createdByDisplayName}
                    </p>
                  </div>
                  <span className="max-w-[42%] shrink-0 truncate text-right tabular-nums text-foreground">
                    {formatMoney(tx.amountCents, tx.currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/**
 * Group overview fallback (SPEC-20): net worth + balances + activity rows while
 * the read model streams. Never renders real amounts — money stays fresh.
 */
export function GroupOverviewSkeleton() {
  return (
    <div aria-busy aria-label="Cargando grupo">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-6 w-48 max-w-full" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>

      <section className="mb-8 space-y-3">
        <Skeleton className="h-4 w-40" />
        <ul className="divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <Skeleton className="h-4 w-32 max-w-full" />
              <Skeleton className="h-6 w-28 shrink-0 rounded-full" />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <Skeleton className="h-4 w-36" />
        <ul className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-2/5" />
              </div>
              <Skeleton className="h-4 w-16 shrink-0" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
