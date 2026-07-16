# Finance Hub — Interface System

Direction: Dub-inspired product UI — calm, precise, premium-light.
Depth: borders + soft shadow (shadow-sm / shadow-md). No heavy Material shadows.
Spacing base: 4px. Product density: medium-compact.
Type: Geist Sans / Geist Mono. Ratio ~1.25. Weight ceiling 600.
Signature: single inset sidebar + content panel. Create flows via right FormSheet (full-bleed mobile, drawer desktop) — never inline forms stacked above lists.
Responsive: **mobile-first**. Base = phone; `sm` richer controls, `md` sidebar inset, `lg` dashboard 2-col.

## Tokens (see globals.css)

- Surfaces: background (canvas), card, muted, sidebar
- Action: primary (ink), info (interactive blue for badges/links — not nav active)
- Finance: income, expense, transfer (+ muted pairs)
- Status: success, warning, destructive
- Nav active: sidebar-accent (neutral)

## Hard rules

- No hardcoded colors in product UI
- Prefer shadcn + CVA variants
- Mobile-first layouts (no desktop-first + max-* patches)
- Dense tables: hide secondary columns below `sm`/`md`
- Money uses tabular-nums
- Business logic stays out of React components
- Create: `FormSheet` right drawer (full mobile / md–lg desktop). CTAs in `ContentPanel.actions` or `?new=1`
- Form density: 1 column · `FormField` · `FormSection` · `SegmentedControl` for type toggles
- Progress bars: `ProgressBar` with ≥3 tones; red (`alert`) only for real alerts (budget exceeded)

Reference: DESIGN.md
