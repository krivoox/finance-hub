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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewGroupWorkspaceForm() {
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
      toast.success("Workspace creado");
      reset({ name: "", baseCurrency: "ARS" });
      router.refresh();
    });
  });

  const isBusy = isPending || isSubmitting;

  return (
    <form className="max-w-md space-y-4" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <label
          htmlFor="workspace-name"
          className="text-sm font-medium text-muted-foreground"
        >
          Nombre
        </label>
        <Input
          id="workspace-name"
          placeholder="Hogar, Familia..."
          aria-invalid={Boolean(errors.name)}
          {...register("name")}
        />
        {errors.name ? (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="workspace-currency"
          className="text-sm font-medium text-muted-foreground"
        >
          Moneda base
        </label>
        <select
          id="workspace-currency"
          aria-invalid={Boolean(errors.baseCurrency)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          {...register("baseCurrency")}
        >
          {SUPPORTED_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        {errors.baseCurrency ? (
          <p className="text-xs text-destructive">
            {errors.baseCurrency.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={isBusy}>
        {isBusy ? "Creando..." : "Crear workspace"}
      </Button>
    </form>
  );
}
