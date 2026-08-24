"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createGroupWorkspaceAction } from "@/features/workspaces/actions";
import {
  createGroupWorkspaceSchema,
  type CreateGroupWorkspaceInput,
} from "@/features/workspaces/schemas";
import { SUPPORTED_CURRENCIES } from "@/features/auth/domain/profile";
import {
  FormActions,
  FormField,
  FormStack,
} from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nativeSelectClassName } from "@/components/ui/native-select";
import { navigateAndRefresh } from "@/lib/navigation";

type NewGroupWorkspaceFormProps = {
  successHref?: string;
  onSuccess?: () => void;
};

export function NewGroupWorkspaceForm({
  successHref = "/onboarding",
  onSuccess,
}: NewGroupWorkspaceFormProps = {}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupWorkspaceInput>({
    resolver: zodResolver(createGroupWorkspaceSchema),
    defaultValues: { name: "", baseCurrency: "ARS" },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await createGroupWorkspaceAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Espacio creado");
      reset({ name: "", baseCurrency: "ARS" });
      onSuccess?.();
      navigateAndRefresh(router, successHref);
    });
  });

  const isBusy = isPending || isSubmitting;

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FormStack>
        <FormField
          label="Nombre"
          htmlFor="workspace-name"
          error={errors.name?.message}
        >
          <Input
            id="workspace-name"
            placeholder="Hogar, Familia..."
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </FormField>

        <FormField
          label="Moneda base"
          htmlFor="workspace-currency"
          error={errors.baseCurrency?.message}
        >
          <select
            id="workspace-currency"
            aria-invalid={Boolean(errors.baseCurrency)}
            className={nativeSelectClassName}
            {...register("baseCurrency")}
          >
            {SUPPORTED_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </FormField>
      </FormStack>

      <FormActions>
        <Button type="submit" className="w-full sm:w-auto" disabled={isBusy}>
          {isBusy ? "Creando..." : "Crear workspace"}
        </Button>
      </FormActions>
    </form>
  );
}
