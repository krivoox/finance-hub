"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  archiveCategorySchema,
  type ArchiveCategoryInput,
} from "@/features/categories/schemas";
import { archiveCategory as archiveCategoryService } from "@/features/categories/services";
import { categoryErrorToMessage, type ActionResult } from "./errors";

export async function archiveCategoryAction(
  input: ArchiveCategoryInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = archiveCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await archiveCategoryService({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      categoryId: parsed.data.categoryId,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: categoryErrorToMessage(err) };
  }
}
