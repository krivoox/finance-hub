# Finance Hub — Interface System

Direction: Dub-inspired product UI — calm, precise, premium-light.
Depth: borders + soft shadow (shadow-sm / shadow-md). No heavy Material shadows.
Spacing base: 4px. Product density: medium-compact.
Type: Geist Sans / Geist Mono. Ratio ~1.25. Weight ceiling 600.
Signature: single inset sidebar (workspace header, quick-create CTA, grouped nav, user footer) + content panel. No dark icon rail.

## Tokens (see globals.css)

- Surfaces: background (canvas), card, muted, sidebar
- Action: primary (ink), info (interactive blue for badges/links — not nav active)
- Finance: income, expense, transfer (+ muted pairs)
- Status: success, warning, destructive
- Nav active: sidebar-accent (neutral)

## Hard rules

- No hardcoded colors in product UI
- Prefer shadcn + CVA variants
- Money uses tabular-nums
- Business logic stays out of React components

Reference: DESIGN.md
