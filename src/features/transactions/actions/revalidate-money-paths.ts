import { revalidatePath } from "next/cache";

/**
 * Invalidate money pages after a ledger mutation.
 *
 * Intentionally does **not** call `revalidatePath("/", "layout")`: that
 * drops the whole Client Router Cache (shell + every visited route). Nav
 * badges catch up on the next layout render. See SPEC-20 / architecture §7.2.
 */
export function revalidateMoneyPaths(options?: {
  groups?: boolean;
  goals?: boolean;
}): void {
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
  if (options?.goals) {
    revalidatePath("/goals");
  }
  if (options?.groups) {
    revalidatePath("/groups");
    revalidatePath("/groups/activity");
  }
}
