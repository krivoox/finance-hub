"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote } from "lucide-react";
import { toast } from "sonner";

import type { UsdQuotesDto } from "@/features/fx-quotes/types";
import { applyMepConsolidationRateAction } from "@/features/fx-quotes/actions";
import { convertWithUsdQuote } from "@/features/fx-quotes/domain";
import { parseAmountCents } from "@/domain/money/parse-amount";
import { AmountInput } from "@/components/amount-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { refreshAfterMutation } from "@/lib/navigation";
import { SegmentedControl } from "@/components/form-sheet";

export type UsdQuotesCardProps = {
  quotes: UsdQuotesDto;
  workspaceId: string | null;
  canMutate: boolean;
};

function formatArsPerUsd(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMajorMoney(cents: number, currency: "ARS" | "USD"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function relativeFetchedLabel(fetchedAt: string | null): string {
  if (!fetchedAt) return "Sin cotización";
  const ms = Date.now() - new Date(fetchedAt).getTime();
  const mins = Math.max(0, Math.round(ms / 60_000));
  if (mins < 60) return `Actualizado hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `Actualizado hace ${hours} h`;
  return `Actualizado el ${fetchedAt.slice(0, 10)}`;
}

type QuoteSource = "mep" | "oficial";

function ConverterPanel({
  quotes,
  className,
}: {
  quotes: UsdQuotesDto;
  className?: string;
}) {
  const [fromCurrency, setFromCurrency] = useState<"ARS" | "USD">("USD");
  const [source, setSource] = useState<QuoteSource>("mep");
  const [amount, setAmount] = useState("100");

  const line = source === "mep" ? quotes.mep : quotes.oficial;
  const toCurrency = fromCurrency === "USD" ? "ARS" : "USD";

  const result = useMemo(() => {
    if (!line) return null;
    const amountCents = parseAmountCents(amount, { allowZero: true });
    if (amountCents === null) return null;
    try {
      const out = convertWithUsdQuote({
        amountCents,
        from: fromCurrency,
        to: toCurrency,
        line,
        side: "sell",
      });
      return out;
    } catch {
      return null;
    }
  }, [amount, fromCurrency, line, toCurrency]);

  if (!quotes.available || !line) {
    return (
      <p className="text-xs text-muted-foreground">
        No hay cotización para convertir.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <SegmentedControl
        value={fromCurrency}
        onChange={setFromCurrency}
        ariaLabel="Dirección de conversión"
        options={[
          { value: "USD", label: "USD → ARS" },
          { value: "ARS", label: "ARS → USD" },
        ]}
      />
      <SegmentedControl
        value={source}
        onChange={setSource}
        ariaLabel="Cotización a usar"
        options={[
          { value: "mep", label: "MEP" },
          { value: "oficial", label: "Oficial" },
        ]}
      />
      <AmountInput
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        aria-label={`Monto en ${fromCurrency}`}
      />
      <p className="text-sm tabular-nums text-foreground">
        {result == null
          ? "—"
          : `≈ ${formatMajorMoney(result, toCurrency)}`}
      </p>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Estimado · {line.displayName} venta · no es el débito del banco.
      </p>
    </div>
  );
}

function QuotesBody({
  quotes,
  workspaceId,
  canMutate,
}: UsdQuotesCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [converterOpen, setConverterOpen] = useState(false);
  const { isMobile } = useSidebar();

  const applyMep = () => {
    if (!workspaceId) return;
    startTransition(async () => {
      const result = await applyMepConsolidationRateAction({ workspaceId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("TC de consolidación = MEP de hoy");
      refreshAfterMutation(router);
    });
  };

  if (!quotes.enabled) return null;

  if (!quotes.available) {
    return (
      <div className="rounded-xl border border-sidebar-border bg-sidebar-hover px-2.5 py-2 group-data-[collapsible=icon]:hidden">
        <p className="text-[11px] font-medium text-sidebar-foreground">Dólar</p>
        <p className="mt-0.5 text-xs text-sidebar-foreground">
          Sin cotización por ahora.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-sidebar-border bg-sidebar-hover px-2.5 py-2 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium text-sidebar-foreground">Dólar</p>
          {quotes.stale ? (
            <Badge variant="warning" className="h-4 px-1.5 text-[10px]">
              Vieja
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 text-[10px] text-sidebar-foreground">
          {relativeFetchedLabel(quotes.fetchedAt)}
        </p>
        <dl className="mt-1.5 space-y-0.5 text-xs tabular-nums">
          <div className="flex justify-between gap-2">
            <dt className="text-sidebar-foreground">Oficial</dt>
            <dd className="font-medium text-sidebar-primary-foreground">
              {formatArsPerUsd(quotes.oficial!.sellArsPerUsd)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-sidebar-foreground">MEP</dt>
            <dd className="font-medium text-sidebar-primary-foreground">
              {formatArsPerUsd(quotes.mep!.sellArsPerUsd)}
            </dd>
          </div>
        </dl>

        <div className="mt-2 flex flex-col gap-1.5">
          {isMobile ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-full justify-center text-xs text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-primary-foreground"
              onClick={() => setConverterOpen(true)}
            >
              Convertir
            </Button>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-center text-xs text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-primary-foreground"
                >
                  Convertir
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" side="right" className="w-64">
                <ConverterPanel quotes={quotes} />
              </PopoverContent>
            </Popover>
          )}

          {canMutate && workspaceId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-full border-sidebar-border text-xs text-sidebar-primary-foreground hover:bg-sidebar-hover"
              disabled={isPending}
              onClick={applyMep}
            >
              {isPending ? "Aplicando…" : "Usar MEP de hoy"}
            </Button>
          ) : null}
        </div>

        <p className="mt-1.5 text-[10px] text-sidebar-foreground">
          {quotes.attribution}
        </p>
      </div>

      {/* Collapsed icon mode */}
      <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-8"
              aria-label="Dólar Oficial y MEP"
              onClick={() => setConverterOpen(true)}
            >
              <Banknote className="size-4" strokeWidth={1.75} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Oficial {formatArsPerUsd(quotes.oficial!.sellArsPerUsd)} · MEP{" "}
            {formatArsPerUsd(quotes.mep!.sellArsPerUsd)}
          </TooltipContent>
        </Tooltip>
      </div>

      <Sheet open={converterOpen} onOpenChange={setConverterOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Convertir ARS ↔ USD</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6 pt-2">
            <ConverterPanel quotes={quotes} />
            {canMutate && workspaceId ? (
              <Button
                type="button"
                variant="outline"
                className="mt-4 h-10 w-full"
                disabled={isPending}
                onClick={applyMep}
              >
                {isPending ? "Aplicando…" : "Usar MEP de hoy"}
              </Button>
            ) : null}
            <p className="mt-3 text-[11px] text-muted-foreground">
              {quotes.attribution}
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * SPEC-19 — Mini cotización Oficial + MEP in sidebar footer (above Settings).
 */
export function UsdQuotesCard(props: UsdQuotesCardProps) {
  if (!props.quotes.enabled) return null;
  return <QuotesBody {...props} />;
}
