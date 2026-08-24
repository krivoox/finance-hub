# Finance Hub — Interface System

Direction: ledger navy — cool slate canvas, always-dark navy rail, blue gradient CTAs.
Depth: hairline border + `shadow-card` (0 1px 8px / 6%). No heavy Material shadows.
Spacing base: 4px. Product density: medium (card pad 20–24px, section gap 16–24px).
Type: Plus Jakarta Sans (UI 400–700) + Nunito display/headings/money (up to 800). Geist Mono for code.
Signature: navy sidebar (220px, both themes) + independent white cards on slate canvas — never a wrapping content-panel card. Create flows via right FormSheet.
Responsive: **mobile-first**. Base = phone with docked tab bar; `md` navy sidebar; `lg` dashboard 2-col.

## Tokens (see globals.css)

- Surfaces: background (slate paper / navy night), card (white / lifted navy), sidebar (navy rail)
- Action: `bg-cta` gradient (primary buttons), `info` (focus, mobile tab active)
- Finance: income (emerald), expense (rose), transfer (indigo) + muted pairs
- Status: success, warning, destructive (destructive = rose, aligned with expense)
- Nav active: `sidebar-accent` translucent blue + `sidebar-accent-foreground` (blue-300)

## Hard rules

- No hardcoded colors in product UI (`slate-*` / `blue-*` / hex / `bg-white`)
- Prefer shadcn + CVA variants
- Mobile-first layouts (no desktop-first + max-* patches)
- Dense tables: mobile shows identity + amount only — no horizontal scroll. Hide select/status/actions below `sm`. Amount is nowrap; identity truncates.
- Money uses `.tabular` (Nunito + tabular-nums)
- Business logic stays out of React components
- Create: `FormSheet` right drawer (full mobile / md–lg desktop). CTAs in `ContentPanel.actions` or `?new=1`
- Form density: 1 column · `FormField` · `FormSection` · `SegmentedControl` for type toggles
- Progress bars: `ProgressBar` with ≥3 tones; rose (`alert`) only for real alerts (budget exceeded)
- Page chrome is `ContentPanel` (H1 + actions on canvas). Blocks are `SurfaceSection` cards.
- Sidebar is navy in light **and** dark. Do not invert it to gray paper.

## Component measurements

- Button primary — 40px h · 12px radius · 14px/700 · `bg-cta`
- Nav item — 44px h · 12px radius · 14px/600 idle, 600+ on active
- Card — 16px radius · 20–24px pad · `shadow-card`
- Page title — 18px Nunito 800
- Eyebrow — 10–11px / 600 / uppercase / tracking-widest

Reference: DESIGN.md
