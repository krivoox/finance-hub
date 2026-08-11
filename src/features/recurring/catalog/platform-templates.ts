/**
 * Static catalog of common AR subscription platforms (SPEC-18 delta).
 *
 * Prices are **published list / base** figures from public sources (≈ ago 2026),
 * NOT live scrapes. Most local streaming is ARS; global SaaS stays USD.
 * The wizard always lets the user edit the amount.
 *
 * `defaultTaxMarkupBps`: 2300 ≈ IVA+IIBB (~23%) for **global USD** list prices.
 * Local ARS published prices (Netflix, Spotify, etc.) usually already include
 * taxes on the invoice → use `0` (wizard can still turn taxes on).
 */

import type { AccountCurrency } from "@/domain/money/currencies";
import { SUBSCRIPTION_CATEGORY_NAMES } from "@/features/categories/domain";
import { DEFAULT_TAX_MARKUP_BPS } from "@/features/recurring/domain/subscription-amount";

export type PlatformTemplateId =
  | "netflix"
  | "spotify"
  | "disney-plus"
  | "max"
  | "youtube-premium"
  | "amazon-prime"
  | "apple"
  | "playstation"
  | "adobe"
  | "openai"
  | "claude"
  | "gemini"
  | "github-copilot"
  | "cursor"
  | "perplexity"
  | "icloud"
  | "google-one";

export type PlatformTemplateRegion = "local" | "global";

export type PlatformTemplate = {
  readonly id: PlatformTemplateId;
  readonly name: string;
  /** 1–2 letter monogram fallback */
  readonly monogram: string;
  /** Plan used as default (e.g. Estándar / Individual) */
  readonly planLabel: string;
  /** List / base price in minor units (centavos / cents) */
  readonly listPriceCents: number;
  readonly listCurrency: AccountCurrency;
  /**
   * Suggested tax markup in bps. Override when the published price is already
   * tax-inclusive.
   */
  readonly defaultTaxMarkupBps: number;
  readonly hint: string;
  /** Rough reference month for the list price (YYYY-MM) */
  readonly priceAsOf: string;
  /** Gallery grouping */
  readonly region: PlatformTemplateRegion;
  /** Default expense category name (emoji included; match is emoji-tolerant) */
  readonly defaultCategoryName: string;
};

/**
 * Sources (indicative, Aug 2026 press / official pages):
 * - Netflix / Spotify / Disney+ / Max / Prime: iProfesional 6-ago-2026 (ARS)
 * - YouTube Premium: common AR card charge ~USD 3.05 (MEP manual pay)
 * - ChatGPT Plus / Claude Pro / Gemini / Copilot / Cursor / Perplexity: vendor US list
 * - Adobe All Apps / Apple One / Google One / iCloud: vendor US list
 * - PlayStation Plus Essential: US list ~$9.99 (AR may bill ARS — editable)
 */
export const PLATFORM_TEMPLATES: readonly PlatformTemplate[] = [
  {
    id: "netflix",
    name: "Netflix",
    monogram: "N",
    planLabel: "Estándar",
    listPriceCents: 1_499_900,
    listCurrency: "ARS",
    defaultTaxMarkupBps: 0,
    hint: "Streaming",
    priceAsOf: "2026-08",
    region: "local",
    defaultCategoryName: SUBSCRIPTION_CATEGORY_NAMES.streaming,
  },
  {
    id: "spotify",
    name: "Spotify",
    monogram: "S",
    planLabel: "Individual",
    listPriceCents: 329_900,
    listCurrency: "ARS",
    defaultTaxMarkupBps: 0,
    hint: "Música",
    priceAsOf: "2026-08",
    region: "local",
    defaultCategoryName: SUBSCRIPTION_CATEGORY_NAMES.streaming,
  },
  {
    id: "disney-plus",
    name: "Disney+",
    monogram: "D+",
    planLabel: "Estándar",
    listPriceCents: 1_074_298,
    listCurrency: "ARS",
    defaultTaxMarkupBps: 0,
    hint: "Streaming",
    priceAsOf: "2026-08",
    region: "local",
    defaultCategoryName: SUBSCRIPTION_CATEGORY_NAMES.streaming,
  },
  {
    id: "max",
    name: "Max",
    monogram: "M",
    planLabel: "Estándar",
    listPriceCents: 959_000,
    listCurrency: "ARS",
    defaultTaxMarkupBps: 0,
    hint: "Streaming",
    priceAsOf: "2026-08",
    region: "local",
    defaultCategoryName: SUBSCRIPTION_CATEGORY_NAMES.streaming,
  },
  {
    id: "youtube-premium",
    name: "YouTube Premium",
    monogram: "YT",
    planLabel: "Individual",
    // Many AR cards bill ~USD 3.05 (user buys MEP and pays manually)
    listPriceCents: 305,
    listCurrency: "USD",
    defaultTaxMarkupBps: 0,
    hint: "Video",
    priceAsOf: "2026-08",
    region: "global",
    defaultCategoryName: SUBSCRIPTION_CATEGORY_NAMES.streaming,
  },
  {
    id: "amazon-prime",
    name: "Amazon Prime Video",
    monogram: "AP",
    planLabel: "Mensual",
    listPriceCents: 649_900,
    listCurrency: "ARS",
    defaultTaxMarkupBps: 0,
    hint: "Streaming",
    priceAsOf: "2026-08",
    region: "local",
    defaultCategoryName: SUBSCRIPTION_CATEGORY_NAMES.streaming,
  },
  {
    id: "apple",
    name: "Apple One",
    monogram: "A",
    planLabel: "Individual",
    listPriceCents: 1_995,
    listCurrency: "USD",
    defaultTaxMarkupBps: DEFAULT_TAX_MARKUP_BPS,
    hint: "Ecosistema",
    priceAsOf: "2026-08",
    region: "global",
    defaultCategoryName: SUBSCRIPTION_CATEGORY_NAMES.software,
  },
  {
    id: "playstation",
    name: "PlayStation Plus",
    monogram: "PS",
    planLabel: "Essential",
    listPriceCents: 999,
    listCurrency: "USD",
    defaultTaxMarkupBps: DEFAULT_TAX_MARKUP_BPS,
    hint: "Gaming",
    priceAsOf: "2026-08",
    region: "global",
    defaultCategoryName: SUBSCRIPTION_CATEGORY_NAMES.gaming,
  },
  {
    id: "adobe",
    name: "Adobe Creative Cloud",
    monogram: "Ad",
    planLabel: "All Apps",
    listPriceCents: 5_999,
    listCurrency: "USD",
    defaultTaxMarkupBps: DEFAULT_TAX_MARKUP_BPS,
    hint: "Creativo",
    priceAsOf: "2026-08",
    region: "global",
    defaultCategoryName: SUBSCRIPTION_CATEGORY_NAMES.software,
  },
  {
    id: "openai",
    name: "ChatGPT Plus",
    monogram: "AI",
    planLabel: "Plus",
    listPriceCents: 2_000,
    listCurrency: "USD",
    defaultTaxMarkupBps: DEFAULT_TAX_MARKUP_BPS,
    hint: "IA",
    priceAsOf: "2026-08",
    region: "global",
    defaultCategoryName: SUBSCRIPTION_CATEGORY_NAMES.ai,
  },
  {
    id: "claude",
    name: "Claude Pro",
    monogram: "Cl",
    planLabel: "Pro",
    listPriceCents: 2_000,
    listCurrency: "USD",
    defaultTaxMarkupBps: DEFAULT_TAX_MARKUP_BPS,
    hint: "IA",
    priceAsOf: "2026-08",
    region: "global",
    defaultCategoryName: SUBSCRIPTION_CATEGORY_NAMES.ai,
  },
  {
    id: "gemini",
    name: "Google AI Pro",
    monogram: "Ge",
    planLabel: "Pro",
    listPriceCents: 1_999,
    listCurrency: "USD",
    defaultTaxMarkupBps: DEFAULT_TAX_MARKUP_BPS,
    hint: "IA",
    priceAsOf: "2026-08",
    region: "global",
    defaultCategoryName: SUBSCRIPTION_CATEGORY_NAMES.ai,
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    monogram: "GC",
    planLabel: "Individual",
    listPriceCents: 1_000,
    listCurrency: "USD",
    defaultTaxMarkupBps: DEFAULT_TAX_MARKUP_BPS,
    hint: "IA",
    priceAsOf: "2026-08",
    region: "global",
    defaultCategoryName: SUBSCRIPTION_CATEGORY_NAMES.ai,
  },
  {
    id: "cursor",
    name: "Cursor",
    monogram: "Cu",
    planLabel: "Pro",
    listPriceCents: 2_000,
    listCurrency: "USD",
    defaultTaxMarkupBps: DEFAULT_TAX_MARKUP_BPS,
    hint: "IA",
    priceAsOf: "2026-08",
    region: "global",
    defaultCategoryName: SUBSCRIPTION_CATEGORY_NAMES.ai,
  },
  {
    id: "perplexity",
    name: "Perplexity Pro",
    monogram: "Px",
    planLabel: "Pro",
    listPriceCents: 2_000,
    listCurrency: "USD",
    defaultTaxMarkupBps: DEFAULT_TAX_MARKUP_BPS,
    hint: "IA",
    priceAsOf: "2026-08",
    region: "global",
    defaultCategoryName: SUBSCRIPTION_CATEGORY_NAMES.ai,
  },
  {
    id: "icloud",
    name: "iCloud+",
    monogram: "iC",
    planLabel: "50 GB",
    listPriceCents: 99,
    listCurrency: "USD",
    defaultTaxMarkupBps: DEFAULT_TAX_MARKUP_BPS,
    hint: "Almacenamiento",
    priceAsOf: "2026-08",
    region: "global",
    defaultCategoryName: SUBSCRIPTION_CATEGORY_NAMES.storage,
  },
  {
    id: "google-one",
    name: "Google One",
    monogram: "G1",
    planLabel: "100 GB",
    listPriceCents: 199,
    listCurrency: "USD",
    defaultTaxMarkupBps: DEFAULT_TAX_MARKUP_BPS,
    hint: "Almacenamiento",
    priceAsOf: "2026-08",
    region: "global",
    defaultCategoryName: SUBSCRIPTION_CATEGORY_NAMES.storage,
  },
] as const;

export const PLATFORM_TEMPLATES_LEGAL_DISCLAIMER =
  "Nombres e íconos de terceros solo para identificar la plantilla. Precios de lista orientativos (≈ ago 2026); editá según tu resumen. No hay afiliación.";

export function getPlatformTemplate(
  id: string,
): PlatformTemplate | undefined {
  return PLATFORM_TEMPLATES.find((t) => t.id === id);
}

export function platformTemplatesByRegion(
  region: PlatformTemplateRegion,
): readonly PlatformTemplate[] {
  return PLATFORM_TEMPLATES.filter((t) => t.region === region);
}
