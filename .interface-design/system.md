# Finance Hub — Interface System

Direction: Dub-inspired product UI — calm, precise, premium-light.
Depth: borders + soft shadow (shadow-sm / shadow-md). No heavy Material shadows.
Spacing base: 4px. Product density: medium-compact.
Type: Geist Sans / Geist Mono. Ratio ~1.25. Weight ceiling 600.
Signature: dual sidebar (dark icon rail + light secondary nav) + floating white content panel (rounded-2xl) on soft gray canvas.

## Tokens (see globals.css)

- Surfaces: background (canvas), card, muted, sidebar, sidebar-rail
- Action: primary (ink), info (interactive blue)
- Finance: income, expense, transfer (+ muted pairs)
- Status: success, warning, destructive

## Hard rules

- No hardcoded colors in product UI
- Prefer shadcn + CVA variants
- Money uses tabular-nums
- Business logic stays out of React components

Reference: DESIGN.md
