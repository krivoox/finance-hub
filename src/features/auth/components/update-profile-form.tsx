"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/features/auth/schemas";
import { updateProfile } from "@/features/auth/actions/update-profile";
import { SUPPORTED_CURRENCIES } from "@/features/auth/domain/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type UpdateProfileFormProps = {
  initialValues: UpdateProfileInput;
  email: string;
};

export function UpdateProfileForm({
  initialValues,
  email,
}: UpdateProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: initialValues,
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await updateProfile(values);
      if (result.ok) {
        toast.success("Perfil actualizado");
        return;
      }
      if (result.field && result.field !== "form") {
        setError(result.field, { message: result.error });
      } else {
        setServerError(result.error);
      }
    });
  });

  const isBusy = isPending || isSubmitting;

  return (
    <form className="max-w-md space-y-5" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <label
          htmlFor="displayName"
          className="text-sm font-medium text-muted-foreground"
        >
          Nombre para mostrar
        </label>
        <Input
          id="displayName"
          autoComplete="name"
          aria-invalid={Boolean(errors.displayName)}
          {...register("displayName")}
        />
        {errors.displayName ? (
          <p className="text-xs text-destructive">
            {errors.displayName.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-sm font-medium text-muted-foreground"
        >
          Email
        </label>
        <Input id="email" type="email" value={email} disabled readOnly />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="preferredCurrency"
          className="text-sm font-medium text-muted-foreground"
        >
          Moneda preferida
        </label>
        <select
          id="preferredCurrency"
          aria-invalid={Boolean(errors.preferredCurrency)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          {...register("preferredCurrency")}
        >
          {SUPPORTED_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        {errors.preferredCurrency ? (
          <p className="text-xs text-destructive">
            {errors.preferredCurrency.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="timezone"
          className="text-sm font-medium text-muted-foreground"
        >
          Zona horaria
        </label>
        <Input
          id="timezone"
          placeholder="America/Argentina/Buenos_Aires"
          aria-invalid={Boolean(errors.timezone)}
          {...register("timezone")}
        />
        {errors.timezone ? (
          <p className="text-xs text-destructive">{errors.timezone.message}</p>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Formato IANA (ej. America/Argentina/Buenos_Aires).
          </p>
        )}
      </div>

      {serverError ? (
        <p className="text-xs text-destructive">{serverError}</p>
      ) : null}

      <Button type="submit" disabled={isBusy}>
        {isBusy ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
