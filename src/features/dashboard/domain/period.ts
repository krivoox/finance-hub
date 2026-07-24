/**
 * SPEC-12 FR-04 — Current calendar month period in the user's timezone.
 *
 * Re-exports the shared calendar helper so dashboard and Movimientos stay
 * aligned (SPEC-05 §4.3). Prefer `@/domain/calendar` for new call sites.
 */

export { getCurrentMonthPeriod } from "@/domain/calendar";
