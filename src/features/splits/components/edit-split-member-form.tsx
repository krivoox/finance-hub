"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { renameSplitGroupMemberAction } from "@/features/splits/actions";
import { renameSplitGroupMemberSchema } from "@/features/splits/schemas";
import { FormActions, FormField, FormStack } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { refreshAfterMutation } from "@/lib/navigation";

type EditSplitMemberFormProps = {
  splitGroupId: string;
  memberId: string;
  displayName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function EditSplitMemberForm({
  splitGroupId,
  memberId,
  displayName,
  onSuccess,
  onCancel,
}: EditSplitMemberFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(renameSplitGroupMemberSchema),
    defaultValues: { splitGroupId, memberId, displayName },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await renameSplitGroupMemberAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Nombre actualizado");
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
          htmlFor="edit-split-member-name"
          error={errors.displayName?.message}
        >
          <Input
            id="edit-split-member-name"
            aria-invalid={Boolean(errors.displayName)}
            {...register("displayName")}
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
