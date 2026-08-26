"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createSplitGroupAction } from "@/features/splits/actions";
import {
  createSplitGroupSchema,
  type CreateSplitGroupInput,
} from "@/features/splits/schemas";
import { FormActions, FormField, FormStack } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { navigateAndRefresh } from "@/lib/navigation";
import { invalidateNewTransactionFormOptions } from "@/features/transactions/stores/new-transaction-form-options-store";

type NewSplitGroupFormProps = {
  onSuccess?: () => void;
};

export function NewSplitGroupForm({ onSuccess }: NewSplitGroupFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSplitGroupInput>({
    resolver: zodResolver(createSplitGroupSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await createSplitGroupAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Grupo creado");
      invalidateNewTransactionFormOptions();
      reset({ name: "" });
      onSuccess?.();
      navigateAndRefresh(router, `/groups/${result.data.id}`);
    });
  });

  const isBusy = isPending || isSubmitting;

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FormStack>
        <FormField
          label="Nombre"
          htmlFor="split-group-name"
          hint="Casa, asado del sábado, viaje…"
          error={errors.name?.message}
        >
          <Input
            id="split-group-name"
            placeholder="Casa, Asado del sábado…"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </FormField>
      </FormStack>

      <FormActions>
        <Button type="submit" disabled={isBusy}>
          {isBusy ? "Creando…" : "Crear grupo"}
        </Button>
      </FormActions>
    </form>
  );
}
