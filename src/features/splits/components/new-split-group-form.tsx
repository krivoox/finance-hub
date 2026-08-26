"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createSplitGroupAction } from "@/features/splits/actions";
import {
  createSplitGroupSchema,
  type CreateSplitGroupInput,
} from "@/features/splits/schemas";
import {
  FormActions,
  FormField,
  FormStack,
  SegmentedControl,
} from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { navigateAndRefresh } from "@/lib/navigation";
import {
  SPLIT_GROUP_KIND_OPTIONS,
  splitGroupKindHint,
} from "./split-copy";

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
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateSplitGroupInput>({
    resolver: zodResolver(createSplitGroupSchema),
    defaultValues: { name: "", kind: "ongoing" },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await createSplitGroupAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Grupo creado");
      reset({ name: "", kind: "ongoing" });
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
          error={errors.name?.message}
        >
          <Input
            id="split-group-name"
            placeholder="Casa, Asado del sábado…"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </FormField>

        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <FormField
              label="Qué es"
              htmlFor="split-group-kind"
              hint={splitGroupKindHint(field.value)}
              error={errors.kind?.message}
            >
              <SegmentedControl
                id="split-group-kind"
                ariaLabel="Qué es el grupo"
                value={field.value}
                options={SPLIT_GROUP_KIND_OPTIONS}
                disabled={isBusy}
                onChange={field.onChange}
              />
            </FormField>
          )}
        />
      </FormStack>

      <FormActions>
        <Button type="submit" disabled={isBusy}>
          {isBusy ? "Creando…" : "Crear grupo"}
        </Button>
      </FormActions>
    </form>
  );
}
