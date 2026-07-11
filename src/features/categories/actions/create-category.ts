"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  createCategorySchema,
  type CreateCategoryInput,
} from "@/features/categories/schemas";
import { createCategory as createCategoryService } from "@/features/categories/services";
import { categoryErrorToMessage, type ActionResult } from "./errors";

export async function createCategoryAction(
  input: CreateCategoryInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const result = await createCategoryService({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      parentId: parsed.data.parentId ?? null,
    });
    revalidatePath("/", "layout");
    return { ok: true, data: { id: result.id } };
  } catch (err) {
    return { ok: false, error: categoryErrorToMessage(err) };
  }
}
