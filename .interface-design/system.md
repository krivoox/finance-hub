# Finance Hub — Interface System

Direction: Dub-inspired product UI — calm, precise, premium-light.
Depth: borders + soft shadow (shadow-sm / shadow-md). No heavy Material shadows.
Spacing base: 4px. Product density: medium-compact.
Type: Geist Sans / Geist Mono. Ratio ~1.25. Weight ceiling 600.
Signature: single inset sidebar (workspace header, quick-create CTA, grouped nav, user footer) + content panel. No dark icon rail.
Responsive: **mobile-first**. Base = phone; `sm` forms, `md` sidebar inset, `lg` dashboard 2-col.

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
- Progress bars: `ProgressBar` with ≥3 tones; red (`alert`) only for real alerts (budget exceeded)

Reference: DESIGN.md
