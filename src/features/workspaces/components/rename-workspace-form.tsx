"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { renameWorkspaceAction } from "@/features/workspaces/actions";
import { refreshAfterMutation } from "@/lib/navigation";

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(60, "Máximo 60 caracteres"),
});

type FormValues = z.infer<typeof formSchema>;

type RenameWorkspaceFormProps = {
  workspaceId: string;
  initialName: string;
  canRename: boolean;
};

export function RenameWorkspaceForm({
  workspaceId,
  initialName,
  canRename,
}: RenameWorkspaceFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: initialName },
  });

  if (!canRename) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{initialName}</p>
        <p className="text-xs text-muted-foreground">
          Solo owner o admin pueden renombrar el grupo.
        </p>
      </div>
    );
  }

  function onSubmit(values: FormValues) {
    if (values.name === initialName) {
      toast.message("Sin cambios");
      return;
    }
    startTransition(async () => {
      const result = await renameWorkspaceAction({
        workspaceId,
        name: values.name,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Nombre actualizado");
      refreshAfterMutation(router);
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Nombre del grupo</span>
        <Input {...form.register("name")} autoComplete="off" />
        {form.formState.errors.name ? (
          <span className="text-xs text-destructive">
            {form.formState.errors.name.message}
          </span>
        ) : null}
      </label>
      <Button
        type="submit"
        variant="secondary"
        className="h-10 w-full sm:h-9 sm:w-auto"
        disabled={pending}
      >
        {pending ? "Guardando…" : "Renombrar"}
      </Button>
    </form>
  );
}
