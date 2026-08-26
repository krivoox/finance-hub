# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **ui:** Apply ledger navy design system and restyle transactions

- **ui:** Roll out ledger navy across the app

- **ui:** Colorful nav glyphs and mobile-first money rows

- **dashboard:** Compact mobile home without desktop read models

- **performance:** Accelerate navigation and money refreshes

- Replace group workspaces with SplitGroups

- Drop group kind and add group and member ABM

- Show split-group spending by category

- **email:** Integrate Resend for password reset and marketing

- **ui:** Replace native selects with a custom dropdown

### Fixed

- **ui:** Keep the mobile tab bar in view and avoid stale JS in next dev

- **nav:** Keep mobile Más sheet inside sidebar context

- Stop app shell 500 on leftover group workspaces

- Keep existing ledgers as the implicit personal account

- Open the ledger that already has accounts, not empty personal

- Show the split-group invite URL on the group page

- Refetch split groups when opening Registrar

- Restyle groups UI to match the ledger

- **nav:** Add inline theme control for modal sheets

- **nav:** Drop duplicate account header in Más sheet

- Keep the post-expense splash visible and lift dimmed numbers

- Advance goal progress bars on small contributions

- Keep recurring confirm actions inside the table

- Hide the unused currency-exchange create button

- **ui:** Pin FormSheet CTAs and lock background scroll

- **categories:** Do not autofocus the category search field

- **money:** Parse amount inputs with a canonical comma decimal

- **forms:** Open a decimal keypad and use comma in amount fields

- **email:** Keep public reset and newsletter forms from hanging

- **auth:** Confirm password reset immediately without waiting

[Unreleased]: https://github.com/krivoox/finance-hub/compare/v0.16.0...HEAD

## [0.13.0] - 2026-08-11

### Added

- Add Cafecito donation soft-ask dialog

[0.13.0]: https://github.com/krivoox/finance-hub/compare/v0.12.0...v0.13.0

## [0.12.0] - 2026-08-11

### Added

- Let subscription prices use ARS or USD and share category search

[0.12.0]: https://github.com/krivoox/finance-hub/compare/v0.11.0...v0.12.0

## [0.11.0] - 2026-08-07

### Added

- Add daily USD quotes from DolarApi

- Add subscription platform templates with category defaults

### Fixed

- **ui:** Improve warning badge contrast in dark mode

[0.11.0]: https://github.com/krivoox/finance-hub/compare/v0.10.1...v0.11.0

## [0.10.1] - 2026-08-06

### Fixed

- **auth:** Keep Google session inside PWA standalone

- **auth:** Persist Google session cookies in PWA

[0.10.1]: https://github.com/krivoox/finance-hub/compare/v0.10.0...v0.10.1

## [0.10.0] - 2026-08-06

### Added

- **shell:** Add mobile tab bar and lighter dashboard

### Fixed

- **auth:** Make Google login work in installed PWA

[0.10.0]: https://github.com/krivoox/finance-hub/compare/v0.9.0...v0.10.0

## [0.9.0] - 2026-08-05

### Added

- Recurrentes (SPEC-18), Panel y DateField

[0.9.0]: https://github.com/krivoox/finance-hub/compare/v0.8.0...v0.9.0

## [0.8.0] - 2026-08-04

### Added

- Form instantáneo, picker categorías, budgets y aportes

- CTA pagar tarjeta, tips contextuales y pool Prisma resiliente

[0.8.0]: https://github.com/krivoox/finance-hub/compare/v0.7.0...v0.8.0

## [0.7.0] - 2026-08-04

### Added

- **transactions:** Show categories as pills in table

- **categories:** Stable chart tones for category pills

- **nav:** Alert icon on budgets badge when exceeded

### Fixed

- **nav:** Slightly increase gap in budgets alert badge

[0.7.0]: https://github.com/krivoox/finance-hub/compare/v0.6.0...v0.7.0

## [0.6.0] - 2026-07-31

### Added

- Restore nav feedback, loading skeletons, and mobile FormSheets

[0.6.0]: https://github.com/krivoox/finance-hub/compare/v0.5.0...v0.6.0

## [0.5.0] - 2026-07-31

### Added

- Add Google OAuth as optional sign-in method

[0.5.0]: https://github.com/krivoox/finance-hub/compare/v0.4.0...v0.5.0

## [0.4.0] - 2026-07-24

### Added

- Add SEO-optimized marketing landing on /

- Reorder dashboard layout and enrich cool dark surfaces

- Use neutral white surfaces and clearer dark gray ladder

[0.4.0]: https://github.com/krivoox/finance-hub/compare/v0.3.0...v0.4.0

## [0.3.0] - 2026-07-24

### Added

- **pwa:** Recommend installing the web app on mobile

[0.3.0]: https://github.com/krivoox/finance-hub/compare/v0.2.0...v0.3.0

## [0.2.0] - 2026-07-24

### Added

- **transactions:** Add list filters, period presets, and cursor pagination

### Changed

- Speed up nav and budget reads with period-windowed expenses

[0.2.0]: https://github.com/krivoox/finance-hub/compare/v0.1.0...v0.2.0

## [0.1.0] - 2026-07-16

### Added

- Baseline product release prior to Conventional Commits enforcement (accounts, workspaces, transactions, budgets, and related MVP surfaces)
- Changelog automation (git-cliff), Conventional Commits (commitlint + husky), and SemVer GitHub Actions workflows

[Unreleased]: https://github.com/krivoox/finance-hub/compare/v0.13.0...HEAD
[0.13.0]: https://github.com/krivoox/finance-hub/compare/v0.12.0...v0.13.0
[0.1.0]: https://github.com/krivoox/finance-hub/releases/tag/v0.1.0
