"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { renameSplitGroupAction } from "@/features/splits/actions";
import { renameSplitGroupSchema } from "@/features/splits/schemas";
import { FormActions, FormField, FormStack } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { refreshAfterMutation } from "@/lib/navigation";

type EditSplitGroupFormProps = {
  splitGroupId: string;
  name: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function EditSplitGroupForm({
  splitGroupId,
  name,
  onSuccess,
  onCancel,
}: EditSplitGroupFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(renameSplitGroupSchema),
    defaultValues: { splitGroupId, name },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await renameSplitGroupAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Grupo actualizado");
      onSuccess?.();
      refreshAfterMutation(router);
    });
  });

  const isBusy = isPending || isSubmitting;

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FormStack>
        <FormField
          label="Nombre"
          htmlFor="edit-split-group-name"
          error={errors.name?.message}
        >
          <Input
            id="edit-split-group-name"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </FormField>
      </FormStack>

      <FormActions>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={onCancel}
          >
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={isBusy}>
          {isBusy ? "Guardando…" : "Guardar"}
        </Button>
      </FormActions>
    </form>
  );
}
