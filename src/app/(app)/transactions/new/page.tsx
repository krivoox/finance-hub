import { redirect } from "next/navigation";

/**
 * SPEC-23 — The dedicated `/transactions/new` route is superseded by the core
 * transaction screen at `/new`. Kept as a redirect so old links keep working.
 */
export default function NewTransactionPage() {
  redirect("/new");
}
