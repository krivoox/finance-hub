import Link from "next/link";

import { AbmGlyph } from "@/components/abm-table";
import { Button } from "@/components/ui/button";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import { categoryPillTone } from "@/features/categories/domain/category-pill-tone";
import { splitLeadingEmoji } from "@/features/categories/domain/split-leading-emoji";
import type { ListedTransaction } from "@/features/transactions/services";
import { cn } from "@/lib/utils";

import { amountVariant, formatShortDate, formatSignedAmount } from "./format";

type DashboardRecentProps = {
  transactions: readonly ListedTransaction[];
  /** Max rows in the list (mobile Panel uses a shorter glance). */
  limit?: number;
};

const TYPE_AMOUNT = {
  income: "text-income",
  expense: "text-expense",
  transfer: "text-foreground",
} as const;

const CHART_TONE_GLYPH = {
  "chart-1": "bg-chart-1/15",
  "chart-2": "bg-chart-2/15",
  "chart-3": "bg-chart-3/15",
  "chart-4": "bg-chart-4/15",
  "chart-5": "bg-chart-5/15",
} as const;

const FALLBACK_GLYPH = {
  income: { emoji: "💰", toneClass: "bg-income-muted" },
  expense: { emoji: "🧾", toneClass: "bg-expense-muted" },
  transfer: { emoji: "🔄", toneClass: "bg-transfer-muted" },
} as const;

function rowGlyph(tx: ListedTransaction): { emoji: string; toneClass: string } {
  const variant = amountVariant(tx.type);
  if (tx.categoryName) {
    const { emoji } = splitLeadingEmoji(tx.categoryName);
    if (emoji) {
      const tone = categoryPillTone(tx.categoryId ?? tx.categoryName);
      return { emoji, toneClass: CHART_TONE_GLYPH[tone] };
    }
  }
  return FALLBACK_GLYPH[variant];
}

/**
 * Actividad reciente en formato lista (rail del Panel): identidad + categoría
 * a la izquierda, monto firmado a la derecha. Sin tabla: en el rail y en
 * móvil las columnas secundarias no aportan.
 */
export function DashboardRecent({
  transactions,
  limit = 6,
}: DashboardRecentProps) {
  return (
    <SurfaceSection className="flex h-full flex-col">
      <SurfaceHeader
        title="Actividad reciente"
        description="Últimos movimientos del workspace"
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/transactions">Ver todo</Link>
          </Button>
        }
      />

      {transactions.length === 0 ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-3 py-2">
          <p className="text-sm text-muted-foreground text-pretty">
            Todavía no registraste movimientos en este workspace.
          </p>
          <Button variant="outline" asChild>
            <Link href="/transactions/new">Registrar el primero</Link>
          </Button>
        </div>
      ) : (
        <ul className="-mx-2 divide-y divide-border">
          {transactions.slice(0, limit).map((tx) => {
            const glyph = rowGlyph(tx);
            const amountClass = TYPE_AMOUNT[amountVariant(tx.type)];
            const categoryLabel = tx.categoryName
              ? splitLeadingEmoji(tx.categoryName).label
              : "Sin categoría";

            return (
              <li key={tx.id} className="relative">
                <Link
                  href={`/transactions/${tx.id}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:hover:bg-background/40"
                >
                  <AbmGlyph className={glyph.toneClass}>{glyph.emoji}</AbmGlyph>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {tx.description ?? "Sin descripción"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {categoryLabel} · {formatShortDate(tx.occurredOn)}
                    </span>
                  </span>

                  <span
                    className={cn("shrink-0 text-sm tabular", amountClass)}
                  >
                    {formatSignedAmount(tx.type, tx.amountCents, tx.currency)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </SurfaceSection>
  );
}
