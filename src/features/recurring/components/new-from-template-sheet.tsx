"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { toast } from "sonner";

import {
  FormActions,
  FormField,
  FormSheet,
  FormStack,
  SegmentedControl,
} from "@/components/form-sheet";
import { AmountInput } from "@/components/amount-input";
import { DateField } from "@/components/date-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format-money";
import { refreshAfterMutation } from "@/lib/navigation";
import { createRecurringRuleAction } from "@/features/recurring/actions";
import { createRecurringRuleSchema } from "@/features/recurring/schemas";
import {
  PLATFORM_TEMPLATES,
  PLATFORM_TEMPLATES_LEGAL_DISCLAIMER,
  type PlatformTemplate,
} from "@/features/recurring/catalog/platform-templates";
import { PlatformLogo } from "@/features/recurring/components/platform-logo";
import { CategoryPicker } from "@/features/categories/components/category-picker";
import {
  computeSubscriptionAmountCents,
  computeSubscriptionListBreakdown,
  DEFAULT_TAX_MARKUP_BPS,
  preferSubscriptionAccountId,
  preferSubscriptionCategoryId,
  todayDateOnly,
} from "@/features/recurring/domain";
import {
  CONSOLIDATION_RATE_SCALE,
  convertArsUsdCents,
  rateScaledToArsPerUsd,
} from "@/features/dashboard/domain/consolidation";
import { majorArsPerUsdToRateScaled } from "@/features/fx-quotes/domain/scale";
import type { UsdQuotesDto } from "@/features/fx-quotes/types";
import {
  formatCentsAsAmountInput,
  formatDecimalInput,
  parseAmountCents,
  parseDecimalNumber,
} from "@/domain/money/parse-amount";
import {
  isAccountCurrency,
  type AccountCurrency,
} from "@/domain/money/currencies";

import type { AccountOption, CategoryOption } from "./recurring-form";

type Step = "gallery" | "configure";

type QuotePref = "mep" | "oficial";

type NewFromTemplateSheetProps = {
  workspaceId: string;
  accounts: readonly AccountOption[];
  categories: readonly CategoryOption[];
  quotes: UsdQuotesDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Close template wizard and open the blank recurring form. */
  onStartBlank: () => void;
  /** Optional external trigger (e.g. empty-state CTA). When omitted, uses default button. */
  trigger?: ReactNode;
  showDefaultTrigger?: boolean;
};

function defaultFxFromQuotes(quotes: UsdQuotesDto | null): {
  quotePref: QuotePref;
  arsPerUsd: string;
} {
  const mep = quotes?.mep;
  if (mep && mep.sellRateScaled > 0) {
    return {
      quotePref: "mep",
      arsPerUsd: formatDecimalInput(
        rateScaledToArsPerUsd(mep.sellRateScaled, mep.scale),
      ),
    };
  }
  const oficial = quotes?.oficial;
  if (oficial && oficial.sellRateScaled > 0) {
    return {
      quotePref: "oficial",
      arsPerUsd: formatDecimalInput(
        rateScaledToArsPerUsd(oficial.sellRateScaled, oficial.scale),
      ),
    };
  }
  return {
    quotePref: "mep",
    arsPerUsd: "",
  };
}

export function NewFromTemplateSheet({
  workspaceId,
  accounts,
  categories,
  quotes,
  open,
  onOpenChange,
  onStartBlank,
  trigger,
  showDefaultTrigger = true,
}: NewFromTemplateSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("gallery");
  const [selected, setSelected] = useState<PlatformTemplate | null>(null);

  const [name, setName] = useState("");
  const [listPriceUnits, setListPriceUnits] = useState("");
  const [listCurrency, setListCurrency] = useState<AccountCurrency>("USD");
  const [taxesOn, setTaxesOn] = useState(true);
  const [markupPercent, setMarkupPercent] = useState(
    formatDecimalInput(DEFAULT_TAX_MARKUP_BPS / 100),
  );
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [startDate, setStartDate] = useState(
    () => todayDateOnly(new Date(), "UTC"),
  );
  const [quotePref, setQuotePref] = useState<QuotePref>("mep");
  const [arsPerUsd, setArsPerUsd] = useState("");
  const [fxEdited, setFxEdited] = useState(false);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.kind === "expense"),
    [categories],
  );

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? null,
    [accounts, accountId],
  );
  const accountCurrency = selectedAccount?.currency ?? null;

  const taxMarkupBps = useMemo(() => {
    if (!taxesOn) return 0;
    const pct = parseDecimalNumber(markupPercent, { allowZero: true });
    if (pct === null) return DEFAULT_TAX_MARKUP_BPS;
    return Math.round(pct * 100);
  }, [taxesOn, markupPercent]);

  const listPriceCents = useMemo(
    () => parseAmountCents(listPriceUnits),
    [listPriceUnits],
  );

  const listBreakdown = useMemo(() => {
    if (listPriceCents === null) return null;
    try {
      return computeSubscriptionListBreakdown({
        listPriceCents,
        listCurrency,
        taxMarkupBps,
      });
    } catch {
      return null;
    }
  }, [listPriceCents, listCurrency, taxMarkupBps]);

  const needsFx =
    accountCurrency !== null &&
    isAccountCurrency(accountCurrency) &&
    accountCurrency !== listCurrency;

  const resolvedRate = useMemo(() => {
    const parsed = parseDecimalNumber(arsPerUsd);
    if (parsed === null) {
      return { rateScaled: null as number | null, scale: CONSOLIDATION_RATE_SCALE };
    }
    try {
      return {
        rateScaled: majorArsPerUsdToRateScaled(parsed),
        scale: CONSOLIDATION_RATE_SCALE,
      };
    } catch {
      return { rateScaled: null, scale: CONSOLIDATION_RATE_SCALE };
    }
  }, [arsPerUsd]);

  const amountPreview = useMemo(() => {
    if (
      listPriceCents === null ||
      !accountCurrency ||
      !isAccountCurrency(accountCurrency)
    ) {
      return null;
    }
    try {
      const amountCents = computeSubscriptionAmountCents({
        listPriceCents,
        listCurrency,
        taxMarkupBps,
        accountCurrency,
        rateScaled: resolvedRate.rateScaled ?? undefined,
        scale: resolvedRate.scale,
      });
      return { amountCents, currency: accountCurrency };
    } catch {
      return null;
    }
  }, [
    listPriceCents,
    listCurrency,
    taxMarkupBps,
    accountCurrency,
    resolvedRate,
  ]);

  const crossCurrencyApprox = useMemo(() => {
    if (!listBreakdown || resolvedRate.rateScaled === null) return null;
    const otherCurrency = listCurrency === "USD" ? "ARS" : "USD";
    try {
      return {
        amountCents: computeSubscriptionAmountCents({
          listPriceCents: listBreakdown.subtotalCents,
          listCurrency,
          taxMarkupBps,
          accountCurrency: otherCurrency,
          rateScaled: resolvedRate.rateScaled,
          scale: resolvedRate.scale,
        }),
        currency: otherCurrency,
      };
    } catch {
      return null;
    }
  }, [listBreakdown, listCurrency, taxMarkupBps, resolvedRate]);

  function resetWizard() {
    setStep("gallery");
    setSelected(null);
    setName("");
    setListPriceUnits("");
    setListCurrency("USD");
    setTaxesOn(true);
    setMarkupPercent(formatDecimalInput(DEFAULT_TAX_MARKUP_BPS / 100));
    setAccountId("");
    setCategoryId("");
    setStartDate(todayDateOnly(new Date(), "UTC"));
    const fx = defaultFxFromQuotes(quotes);
    setQuotePref(fx.quotePref);
    setArsPerUsd(fx.arsPerUsd);
    setFxEdited(false);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      resetWizard();
    } else if (step === "gallery" && !selected) {
      const fx = defaultFxFromQuotes(quotes);
      setQuotePref(fx.quotePref);
      setArsPerUsd(fx.arsPerUsd);
      setFxEdited(false);
    }
  }

  function pickTemplate(template: PlatformTemplate) {
    setSelected(template);
    setName(
      template.planLabel
        ? `${template.name} · ${template.planLabel}`
        : template.name,
    );
    setListPriceUnits(formatCentsAsAmountInput(template.listPriceCents));
    setListCurrency(template.listCurrency);
    const taxesDefault = template.defaultTaxMarkupBps > 0;
    setTaxesOn(taxesDefault);
    setMarkupPercent(
      formatDecimalInput(
        (taxesDefault
          ? template.defaultTaxMarkupBps
          : DEFAULT_TAX_MARKUP_BPS) / 100,
      ),
    );
    setAccountId(preferSubscriptionAccountId(accounts) ?? "");
    setCategoryId(
      preferSubscriptionCategoryId(
        categories,
        template.defaultCategoryName,
      ) ?? "",
    );
    const fx = defaultFxFromQuotes(quotes);
    setQuotePref(fx.quotePref);
    setArsPerUsd(fx.arsPerUsd);
    setFxEdited(false);
    setStep("configure");
  }

  function changeListCurrency(next: AccountCurrency) {
    if (next === listCurrency) return;

    const cents = parseAmountCents(listPriceUnits);
    if (cents !== null && resolvedRate.rateScaled !== null) {
      try {
        const converted = convertArsUsdCents(
          cents,
          listCurrency,
          next,
          resolvedRate.rateScaled,
          resolvedRate.scale,
        );
        setListPriceUnits(formatCentsAsAmountInput(converted));
      } catch {
        // Keep the numeric amount; user can edit after switching.
      }
    }

    setListCurrency(next);
  }

  function matchAccountCurrency() {
    if (!accountCurrency || !isAccountCurrency(accountCurrency)) return;
    changeListCurrency(accountCurrency);
  }

  function applyQuoteSource(source: QuotePref) {
    setQuotePref(source);
    setFxEdited(false);
    const line = source === "mep" ? quotes?.mep : quotes?.oficial;
    if (line && line.sellRateScaled > 0) {
      setArsPerUsd(
        String(rateScaledToArsPerUsd(line.sellRateScaled, line.scale)),
      );
    }
  }

  function handleCreate() {
    if (!selected) return;
    if (listPriceCents === null) {
      toast.error("Precio lista inválido");
      return;
    }
    if (!accountId) {
      toast.error("Elegí una cuenta");
      return;
    }
    if (!categoryId) {
      toast.error("Elegí una categoría");
      return;
    }
    if (!accountCurrency || !isAccountCurrency(accountCurrency)) {
      toast.error("Moneda de cuenta no soportada");
      return;
    }
    if (needsFx && resolvedRate.rateScaled === null) {
      toast.error("Indicá el tipo de cambio ARS por USD");
      return;
    }

    let amountCents: number;
    try {
      amountCents = computeSubscriptionAmountCents({
        listPriceCents,
        listCurrency,
        taxMarkupBps,
        accountCurrency,
        rateScaled: resolvedRate.rateScaled ?? undefined,
        scale: resolvedRate.scale,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo calcular el monto",
      );
      return;
    }

    const input = {
      workspaceId,
      name: name.trim() || selected.name,
      type: "expense" as const,
      amountCents,
      accountId,
      counterpartyAccountId: null,
      categoryId,
      description: `Suscripción · ${selected.name}`,
      frequency: "monthly" as const,
      startDate,
      endDate: null,
    };

    const check = createRecurringRuleSchema.safeParse(input);
    if (!check.success) {
      toast.error(check.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    startTransition(async () => {
      const result = await createRecurringRuleAction(check.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Suscripción creada");
      handleOpenChange(false);
      refreshAfterMutation(router);
    });
  }

  const title =
    step === "gallery"
      ? "Desde plantilla"
      : selected
        ? selected.name
        : "Configurar";

  const description =
    step === "gallery"
      ? "Elegí una plataforma y ajustá precio e impuestos."
      : `Precio lista en ${listCurrency} · impuestos estimados · cuenta de débito.`;

  const defaultTrigger = showDefaultTrigger ? (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-1.5 sm:w-auto"
    >
      <LayoutGrid className="size-4" strokeWidth={1.75} aria-hidden />
      Desde plantilla
    </Button>
  ) : undefined;

  return (
    <FormSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      size="lg"
      trigger={trigger ?? defaultTrigger}
    >
      {step === "gallery" ? (
        <div className="flex flex-col gap-5">
          <p className="text-xs text-muted-foreground text-pretty">
            {PLATFORM_TEMPLATES_LEGAL_DISCLAIMER}
          </p>

          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PLATFORM_TEMPLATES.map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  onClick={() => pickTemplate(template)}
                  className={cn(
                    "flex w-full min-h-10 flex-col items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors",
                    "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <PlatformLogo id={template.id} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-foreground">
                      {template.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {template.planLabel} ·{" "}
                      <span className="tabular-nums">
                        {formatMoney(
                          template.listPriceCents,
                          template.listCurrency,
                        )}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <p className="text-center text-sm text-muted-foreground">
            <button
              type="button"
              className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              onClick={() => {
                onOpenChange(false);
                onStartBlank();
              }}
            >
              Empezar en blanco
            </button>
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <button
            type="button"
            className="self-start text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            onClick={() => setStep("gallery")}
            disabled={isPending}
          >
            ← Volver a la galería
          </button>

          {selected ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-3">
              <PlatformLogo id={selected.id} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {selected.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Mensual · gasto
                  {selected.priceAsOf
                    ? ` · lista ≈ ${selected.priceAsOf}`
                    : null}
                </p>
              </div>
            </div>
          ) : null}

          <FormStack>
            <FormField label="Nombre" htmlFor="tpl-name">
              <Input
                id="tpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Netflix, Spotify…"
                disabled={isPending}
              />
            </FormField>

            <FormField
              label="Moneda del precio"
              htmlFor="tpl-list-currency"
              hint={
                accountCurrency
                  ? `La recurrente se guarda en ${accountCurrency}`
                  : "Elegí cómo cargás el precio lista"
              }
            >
              <div className="flex flex-col gap-2">
                <SegmentedControl
                  id="tpl-list-currency"
                  ariaLabel="Moneda del precio lista"
                  value={listCurrency}
                  options={[
                    { value: "ARS" as const, label: "ARS" },
                    { value: "USD" as const, label: "USD" },
                  ]}
                  disabled={isPending}
                  onChange={(v) => changeListCurrency(v)}
                />
                {accountCurrency &&
                isAccountCurrency(accountCurrency) &&
                accountCurrency !== listCurrency ? (
                  <button
                    type="button"
                    className="self-start text-xs text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    disabled={isPending}
                    onClick={matchAccountCurrency}
                  >
                    Usar moneda de la cuenta ({accountCurrency})
                  </button>
                ) : null}
              </div>
            </FormField>

            <FormField
              label="Precio lista"
              htmlFor="tpl-list"
              hint={`${listCurrency} · editable`}
            >
              <AmountInput
                id="tpl-list"
                value={listPriceUnits}
                onChange={(e) => setListPriceUnits(e.target.value)}
                disabled={isPending}
              />
            </FormField>

            <div className="flex flex-col gap-3 rounded-xl border border-border px-3 py-3">
              <label className="flex min-h-10 cursor-pointer items-center gap-3">
                <Checkbox
                  checked={taxesOn}
                  onCheckedChange={(v) => setTaxesOn(v === true)}
                  disabled={isPending}
                  aria-label="Incluir impuestos estimados"
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    Incluir impuestos
                  </span>
                  <span className="text-xs text-muted-foreground text-pretty">
                    Estimación; verificá tu caso
                  </span>
                </span>
              </label>

              {taxesOn ? (
                <FormField
                  label="Markup %"
                  htmlFor="tpl-markup"
                  hint={`Sugerido ${DEFAULT_TAX_MARKUP_BPS / 100}% (IVA+IIBB aprox.)`}
                >
                  <AmountInput
                    id="tpl-markup"
                    placeholder="23,00"
                    value={markupPercent}
                    onChange={(e) => setMarkupPercent(e.target.value)}
                    disabled={isPending}
                  />
                </FormField>
              ) : null}
            </div>

            {listBreakdown ? (
              <div className="rounded-xl border border-border px-3 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Preview {listBreakdown.currency}
                </p>
                <dl className="mt-2 flex flex-col gap-1.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="tabular-nums text-foreground">
                      {formatMoney(
                        listBreakdown.subtotalCents,
                        listBreakdown.currency,
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Impuestos</dt>
                    <dd className="tabular-nums text-foreground">
                      {formatMoney(
                        listBreakdown.taxCents,
                        listBreakdown.currency,
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-border pt-1.5 font-medium">
                    <dt className="text-foreground">Total</dt>
                    <dd className="tabular-nums text-foreground">
                      {formatMoney(
                        listBreakdown.totalCents,
                        listBreakdown.currency,
                      )}
                    </dd>
                  </div>
                </dl>
                {crossCurrencyApprox ? (
                  <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                    ≈{" "}
                    {formatMoney(
                      crossCurrencyApprox.amountCents,
                      crossCurrencyApprox.currency,
                    )}
                    {!fxEdited
                      ? ` · TC ${quotePref === "mep" ? "MEP" : "oficial"}`
                      : " · TC manual"}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground text-pretty">
                  Estimado. Verificá el monto en tu resumen.
                </p>
              </div>
            ) : null}

            {/* FX: needed to convert list↔account, or to preview the other currency */}
            {needsFx ||
            listCurrency === "USD" ||
            accountCurrency === "USD" ? (
              <>
                {(quotes?.mep || quotes?.oficial) && (
                  <FormField label="Tipo de cambio" htmlFor="tpl-fx-source">
                    <SegmentedControl
                      id="tpl-fx-source"
                      ariaLabel="Fuente de cotización"
                      value={quotePref}
                      options={[
                        ...(quotes?.mep
                          ? [{ value: "mep" as const, label: "MEP" }]
                          : []),
                        ...(quotes?.oficial
                          ? [{ value: "oficial" as const, label: "Oficial" }]
                          : []),
                      ]}
                      disabled={isPending}
                      onChange={(v) => applyQuoteSource(v)}
                    />
                  </FormField>
                )}

                <FormField
                  label="ARS por 1 USD"
                  htmlFor="tpl-fx"
                  hint={
                    needsFx
                      ? "Requerido para convertir a la cuenta"
                      : "Opcional · para ver ≈ en la otra moneda"
                  }
                >
                  <AmountInput
                    id="tpl-fx"
                    placeholder="Ej. 1450"
                    value={arsPerUsd}
                    onChange={(e) => {
                      setFxEdited(true);
                      setArsPerUsd(e.target.value);
                    }}
                    disabled={isPending}
                  />
                </FormField>
              </>
            ) : null}

            <FormField label="Cuenta" htmlFor="tpl-account">
              <Select
                id="tpl-account"
                value={accountId}
                onValueChange={setAccountId}
                disabled={isPending}
                placeholder="Elegí una cuenta"
                options={[
                  { value: "", label: "Elegí una cuenta" },
                  ...accounts.map((a) => ({
                    value: a.id,
                    label: `${a.name} · ${a.currency}`,
                  })),
                ]}
              />
            </FormField>

            <FormField label="Categoría" htmlFor="tpl-category">
              <CategoryPicker
                mode="single"
                id="tpl-category"
                categories={expenseCategories.map((c) => ({
                  id: c.id,
                  name: c.name,
                }))}
                value={categoryId || null}
                onChange={(id) => setCategoryId(id ?? "")}
                disabled={isPending}
                placeholder="Elegir categoría"
              />
            </FormField>

            <FormField
              label="Día de cobro"
              htmlFor="tpl-start"
              hint="Primera fecha · frecuencia mensual"
            >
              <DateField
                id="tpl-start"
                name="startDate"
                value={startDate}
                onChange={setStartDate}
              />
            </FormField>

            {amountPreview ? (
              <div className="rounded-lg border border-dashed border-border px-3 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Monto de la recurrente
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {formatMoney(amountPreview.amountCents, amountPreview.currency)}
                </p>
              </div>
            ) : needsFx && !arsPerUsd ? (
              <p className="text-sm text-muted-foreground">
                Completá el tipo de cambio para convertir a la cuenta.
              </p>
            ) : null}
          </FormStack>

          <FormActions>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={isPending || !amountPreview}
              onClick={handleCreate}
            >
              {isPending ? "Creando…" : "Crear recurrente"}
            </Button>
          </FormActions>

          <p className="text-center text-sm text-muted-foreground">
            <button
              type="button"
              className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              disabled={isPending}
              onClick={() => {
                onOpenChange(false);
                onStartBlank();
              }}
            >
              Empezar en blanco
            </button>
          </p>
        </div>
      )}
    </FormSheet>
  );
}
