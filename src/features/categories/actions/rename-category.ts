"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  renameCategorySchema,
  type RenameCategoryInput,
} from "@/features/categories/schemas";
import { renameCategory as renameCategoryService } from "@/features/categories/services";
import { categoryErrorToMessage, type ActionResult } from "./errors";

export async function renameCategoryAction(
  input: RenameCategoryInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = renameCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await renameCategoryService({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: categoryErrorToMessage(err) };
  }
}
