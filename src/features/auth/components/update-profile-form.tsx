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
import {
  FormActions,
  FormField,
  FormStack,
} from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/ui/select";

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
    control,
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
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FormStack>
        <FormField
          label="Nombre para mostrar"
          htmlFor="displayName"
          error={errors.displayName?.message}
        >
          <Input
            id="displayName"
            autoComplete="name"
            aria-invalid={Boolean(errors.displayName)}
            {...register("displayName")}
          />
        </FormField>

        <FormField label="Email" htmlFor="email">
          <Input id="email" type="email" value={email} disabled readOnly />
        </FormField>

        <FormField
          label="Moneda preferida"
          htmlFor="preferredCurrency"
          error={errors.preferredCurrency?.message}
        >
          <FormSelect
            control={control}
            name="preferredCurrency"
            id="preferredCurrency"
            invalid={Boolean(errors.preferredCurrency)}
            options={SUPPORTED_CURRENCIES.map((code) => ({
              value: code,
              label: code,
            }))}
          />
        </FormField>

        <FormField
          label="Zona horaria"
          htmlFor="timezone"
          error={errors.timezone?.message}
          hint={
            errors.timezone
              ? undefined
              : "Formato IANA (ej. America/Argentina/Buenos_Aires)."
          }
        >
          <Input
            id="timezone"
            placeholder="America/Argentina/Buenos_Aires"
            aria-invalid={Boolean(errors.timezone)}
            {...register("timezone")}
          />
        </FormField>
      </FormStack>

      {serverError ? (
        <p className="text-xs text-destructive">{serverError}</p>
      ) : null}

      <FormActions>
        <Button type="submit" className="w-full sm:w-auto" disabled={isBusy}>
          {isBusy ? "Guardando..." : "Guardar cambios"}
        </Button>
      </FormActions>
    </form>
  );
}
