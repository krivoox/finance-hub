import { formatMoney } from "@/lib/format-money";
import { SurfaceSection } from "@/components/surface-section";

type PublicView = Awaited<
  ReturnType<typeof import("@/features/splits/services").getPublicSplitGroup>
>;

export function PublicSplitGroupView({
  group,
  joinHref,
}: {
  group: PublicView;
  joinHref?: string;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Gastos divididos
        </p>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
          {group.name}
        </h1>
      </header>

      <SurfaceSection>
        <h2 className="mb-3 text-sm font-medium text-foreground">Quién debe</h2>
        <ul className="space-y-2">
          {group.members.map((member) => (
            <li
              key={member.displayName}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="truncate text-foreground">{member.displayName}</span>
              <span className="tabular-nums text-muted-foreground">
                {member.netCents > 0
                  ? `Le deben ${formatMoney(member.netCents, group.currency)}`
                  : member.netCents < 0
                    ? `Debe ${formatMoney(Math.abs(member.netCents), group.currency)}`
                    : "En paz"}
              </span>
            </li>
          ))}
        </ul>
      </SurfaceSection>

      <SurfaceSection>
        <h2 className="mb-3 text-sm font-medium text-foreground">Gastos</h2>
        {group.activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay gastos.</p>
        ) : (
          <ul className="space-y-2">
            {group.activity.map((item, index) => (
              <li
                key={`${item.paidByDisplayName}-${index}`}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate text-foreground">
                    {item.description || "Gasto"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Pagó {item.paidByDisplayName}
                  </span>
                </span>
                <span className="tabular-nums">
                  {formatMoney(item.amountCents, group.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SurfaceSection>

      {joinHref ? (
        <p className="text-sm text-muted-foreground">
          ¿Tenés la app?{" "}
          <a href={joinHref} className="underline underline-offset-2">
            Entrá al grupo
          </a>
        </p>
      ) : null}
    </main>
  );
}
