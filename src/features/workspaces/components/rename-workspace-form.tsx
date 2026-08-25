"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import {
  FormActions,
  FormField,
  FormStack,
} from "@/components/form-sheet";
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
          Solo owner o admin pueden renombrar el espacio.
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
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormStack>
        <FormField
          label="Nombre"
          htmlFor="workspace-rename"
          error={form.formState.errors.name?.message}
        >
          <Input
            id="workspace-rename"
            autoComplete="off"
            {...form.register("name")}
          />
        </FormField>
      </FormStack>
      <FormActions>
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={pending}
        >
          {pending ? "Guardando…" : "Renombrar"}
        </Button>
      </FormActions>
    </form>
  );
}
